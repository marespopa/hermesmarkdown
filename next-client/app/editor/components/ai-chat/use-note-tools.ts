"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { searchNoteContent } from "@/app/services/content-search-client";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import {
  DEFAULT_SEARCH_LIMIT,
  readNoteOutput,
  searchablePaths,
  searchNotesOutput,
  taskFilter,
  toolActivity,
  type TaskView,
} from "./chat-tool-runners";
import { openTasksBlock } from "./skill-context";

export type NoteToolCall = { toolName: string; input: unknown };
export type NoteToolResult = { output: string; activity: string };

// The read-only note tools, run in the browser against the open vault:
// search_notes (content index, plus names and tags), read_note and
// list_open_tasks. The AI companion (companion/use-companion-tools.ts)
// runs them through `runTool`.
export function useNoteTools() {
  const store = useStore();
  const { readCurrentText } = useNoteBuffer();

  const skip = useCallback((path: string) => {
    const folder = store.get(atom_templatesFolder).folder;
    return path.startsWith(".hermesmarkdown/") || isTemplatePath(path, folder);
  }, [store]);

  const runTool = useCallback(async ({ toolName, input: rawInput }: NoteToolCall): Promise<NoteToolResult> => {
    const input = (rawInput ?? {}) as Record<string, unknown>;
    const meta = store.get(atom_fileMetadata);
    if (toolName === "search_notes") {
      const query = String(input.query ?? "").trim();
      const limit = Math.min(20, Math.max(1, Number(input.limit) || DEFAULT_SEARCH_LIMIT));
      const paths = searchablePaths(meta, skip);
      const result = query ? await searchNoteContent(query, paths, limit) : null;
      const output = searchNotesOutput(query, meta, paths, result?.hits ?? null, limit);
      const found = output.match(/^(\d+) notes? match/)?.[1] ?? "0";
      return { output, activity: toolActivity(toolName, input, `${found} found`) };
    }
    if (toolName === "read_note") {
      const name = String(input.name ?? "");
      const file = resolveFileMetaByName(name, meta);
      const usable = file && !skip(file.path) ? file : null;
      let text: string | null = null;
      if (usable) {
        try {
          text = await readCurrentText(usable.path);
        } catch (err) {
          console.warn("File tools: couldn't read", usable.path, err);
        }
      }
      return { output: readNoteOutput(name, usable, text), activity: toolActivity(toolName, input) };
    }
    if (toolName === "list_open_tasks") {
      const filter = taskFilter({ view: input.view as TaskView | undefined, tag: input.tag as string | undefined, query: input.query as string | undefined });
      return { output: openTasksBlock(meta, new Date(), skip, filter), activity: toolActivity(toolName, input) };
    }
    return { output: `Unknown tool ${toolName}.`, activity: toolActivity(toolName, input) };
  }, [store, skip, readCurrentText]);

  return { runTool };
}
