"use client";

import { useCallback, useRef } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath, atom_content, atom_fileName } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { downloadMarkdown } from "@/app/utils/download-markdown";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { findEmbeds } from "../utils/note-embeds";
import { useCompileEmbeds } from "./use-embed-reader";
import { VEILED_REASON } from "./use-export-pdf";

// "Export as Compiled Markdown": the focused note as one .md download with
// every embed filled in (notes, nested ones too, CSV tables, code blocks,
// image links from the vault root). Like Export as Markdown it never
// writes to the vault. Offered only when the note has embeds.
export function useDownloadCompiled() {
  const store = useStore();
  const content = useAtomValue(atom_content);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const metadata = useAtomValue(atom_fileMetadata);
  const revealAll = useAtomValue(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);
  const compileEmbeds = useCompileEmbeds();
  const busy = useRef(false);

  const path = activeFilePath ?? "draft";
  const veiled = (isPrivateContent(content) || isPrivateFrontmatter(metadata[path]?.frontmatter))
    && !revealAll && !revealed.has(path);
  const hasEmbeds = /^[ \t]*(?:!\[\[|\/[^\s/])/m.test(content) && findEmbeds(content).length > 0;
  const disabledReason = !hasEmbeds ? "The note has no embeds" : veiled ? VEILED_REASON : undefined;

  const download = useCallback(async () => {
    if (busy.current || disabledReason) return;
    busy.current = true;
    try {
      const compiled = await compileEmbeds(store.get(atom_content), store.get(atom_activeFilePath) ?? "draft");
      const name = downloadMarkdown(compiled, store.get(atom_fileName));
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      console.warn("Export as Compiled Markdown failed:", err);
      toast.error("Couldn't compile the note");
    } finally {
      busy.current = false;
    }
  }, [compileEmbeds, disabledReason, store]);

  useRegisterCommand({
    id: "download-compiled-markdown",
    label: "Export as Compiled Markdown",
    category: "Document",
    keywords: "export download compile build embeds transclusion merge chapters book single file md",
    disabledReason,
    action: () => void download(),
  });
}
