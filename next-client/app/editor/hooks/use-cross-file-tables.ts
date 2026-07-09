"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FileMetadata } from "@/app/atoms/metadata";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { findAllTables } from "../utils/table-detection";
import { extractTableSource, parseTableLenient, type TableData } from "../utils/tableParser";
import { normalizeNoteKey } from "../utils/formula-engine";

const WIKILINK_FORMULA_REF_RE = /\[\[([^\]]+)\]\]!/g;

function extractNoteKeys(value: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  WIKILINK_FORMULA_REF_RE.lastIndex = 0;
  while ((match = WIKILINK_FORMULA_REF_RE.exec(value)) !== null) {
    keys.add(normalizeNoteKey(match[1]).key);
  }
  return [...keys];
}

async function readFileTables(meta: FileMetadata): Promise<Map<string, TableData>> {
  const tables = new Map<string, TableData>();
  try {
    const file = await meta.handle.getFile();
    const text: string = await file.text();
    for (const block of findAllTables(text)) {
      const src = extractTableSource(block.lines, block.tableStart, block.tableEnd);
      const data = parseTableLenient(src);
      if (data && block.heading) tables.set(block.heading, data);
      else if (data && !tables.has("")) tables.set("", data);
    }
  } catch {
    // Unreadable file (deleted, permission revoked, etc.) — leave empty so
    // references to it resolve to #REF! rather than throwing.
  }
  return tables;
}

// Resolves `[[Note]]!...` formula references in `value` into the synchronous
// `fileTables` map `evaluateTable` needs. Reads are async (file handles), so
// this only ever reflects a point-in-time snapshot of the referenced files —
// it does not react to edits made to those files elsewhere. The cache is
// invalidated wholesale whenever the pane regains focus (isActivePane
// false -> true), which is the only refresh trigger for cross-file data.
export function useCrossFileTables(
  value: string,
  fileMetadata: Record<string, FileMetadata>,
  isActivePane: boolean,
): Map<string, Map<string, TableData>> {
  const cacheRef = useRef<Map<string, Map<string, TableData>>>(new Map());
  const [version, setVersion] = useState(0);
  const [generation, setGeneration] = useState(0);
  const wasActiveRef = useRef(isActivePane);

  const noteKeys = useMemo(() => extractNoteKeys(value), [value]);
  const noteKeysSignature = noteKeys.join(" ");

  useEffect(() => {
    if (isActivePane && !wasActiveRef.current) {
      cacheRef.current = new Map();
      setGeneration((g) => g + 1);
    }
    wasActiveRef.current = isActivePane;
  }, [isActivePane]);

  useEffect(() => {
    const missing = noteKeys.filter((k) => !cacheRef.current.has(k));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const noteKey of missing) {
        const resolved = resolveFileMetaByName(noteKey, fileMetadata);
        const tables = resolved ? await readFileTables(resolved) : new Map<string, TableData>();
        if (cancelled) return;
        cacheRef.current.set(noteKey, tables);
      }
      if (!cancelled) setVersion((v) => v + 1);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKeysSignature, fileMetadata, generation]);

  // New outer Map reference whenever the cache mutates, so callers using it
  // as an effect/useCallback dependency see the update (cacheRef.current is
  // mutated in place above and wouldn't otherwise change identity).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Map(cacheRef.current), [version]);
}
