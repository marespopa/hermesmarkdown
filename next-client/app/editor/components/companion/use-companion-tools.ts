"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { atom_vaultFolderPaths, atom_vaultHandle, atom_vaultTextFiles } from "@/app/atoms/vault-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { NOTE_TOOL_DEFS } from "@/app/services/note-tool-defs";
import { useNoteTools, type NoteToolResult } from "../ai-chat/use-note-tools";
import { guardFilePath, guardFolderPath } from "./tools/path-guard";
import { useCompanionOrganise } from "./use-companion-organise";
import { useCompanionWrites } from "./use-companion-writes";
import type { FindReplace } from "./tools/edit-tools";
import { findFilesOutput, globMatcher, matchesIn, searchFilesOutput, searchMatcher, searchablePaths, SEARCH_DEFAULT_LIMIT, SEARCH_MAX_FILES, type SearchMatch } from "./tools/search-tools";
import { activeNoteOutput, codeBlockAt, companionToolActivity, listFolderOutput, readFileOutput } from "./tools/read-tools";

const NO_VAULT = "No vault is open, so there are no files to look at. Ask the user to open a folder.";

// A tool call to run: its name, input and id (trash's card is shown by it).
export type CompanionToolCall = { toolName: string; input: unknown; toolCallId?: string };

const stringList = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

// Runs the companion's tool calls in the browser: the note tools through
// useNoteTools, the vault and editor read tools (list_folder, read_file,
// get_active_note, search_files, find_files) here, behind the path guard,
// the writes (edit_file, create_file,
// create_folder, create_template) through
// useCompanionWrites and the organising tools (rename, move, trash) through
// useCompanionOrganise, recorded in the turn's undo group (`turnId`, the id
// of the user message that started it). Every call
// answers `{ output, activity }`: the text sent back to the model and the
// line its chip shows. A failed call answers its reason; it never throws.
export function useCompanionTools() {
  const store = useStore();
  const { runTool: runNoteTool } = useNoteTools();
  const { readCurrentText } = useNoteBuffer();
  const writes = useCompanionWrites();
  const organise = useCompanionOrganise();

  const runTool = useCallback(async ({ toolName, input: rawInput, toolCallId = "" }: CompanionToolCall, turnId = "turn"): Promise<NoteToolResult> => {
    const input = (rawInput ?? {}) as Record<string, unknown>;
    const activity = (detail = "") => companionToolActivity(toolName, input, detail);
    try {
      if (toolName in NOTE_TOOL_DEFS) {
        if (!store.get(atom_vaultHandle)) return { output: NO_VAULT, activity: activity() };
        return await runNoteTool({ toolName, input });
      }
      if (toolName === "get_active_note") {
        const path = store.get(atom_activeFilePath);
        const view = store.get(atom_activeEditorView);
        const doc = view?.state.doc.toString() ?? "";
        const { from, to, head } = view?.state.selection.main ?? { from: 0, to: 0, head: 0 };
        const isPrivate = !!path && (isPrivateFrontmatter(store.get(atom_fileMetadata)[path]?.frontmatter) || isPrivateContent(doc));
        const output = activeNoteOutput({
          path,
          selection: view ? view.state.sliceDoc(from, to) : "",
          codeBlock: view ? codeBlockAt(doc, head) : null,
          isPrivate,
        });
        return { output, activity: activity() };
      }
      if (toolName === "list_folder") {
        if (!store.get(atom_vaultHandle)) return { output: NO_VAULT, activity: activity() };
        const guarded = guardFolderPath(String(input.path ?? ""));
        if (!guarded.ok) return { output: guarded.reason, activity: activity("refused") };
        const output = listFolderOutput(guarded.path, Number(input.page) || 1, {
          notes: store.get(atom_fileMetadata),
          textFiles: store.get(atom_vaultTextFiles).map((file) => file.path),
          folders: store.get(atom_vaultFolderPaths),
        });
        return { output, activity: activity() };
      }
      if (toolName === "read_file") {
        if (!store.get(atom_vaultHandle)) return { output: NO_VAULT, activity: activity() };
        const guarded = guardFilePath(String(input.path ?? ""));
        if (!guarded.ok) return { output: guarded.reason, activity: activity("refused") };
        const note = store.get(atom_fileMetadata)[guarded.path];
        if (note && isPrivateFrontmatter(note.frontmatter)) {
          return { output: readFileOutput(guarded.path, note, null), activity: activity("private") };
        }
        let text: string | null = null;
        try {
          text = await readCurrentText(guarded.path);
        } catch (err) {
          console.warn("Companion: couldn't read", guarded.path, err);
        }
        return { output: readFileOutput(guarded.path, note, text, Number(input.startLine) || undefined, Number(input.lineCount) || undefined), activity: activity(text === null ? "not found" : "") };
      }
      if (toolName === "search_files") {
        if (!store.get(atom_vaultHandle)) return { output: NO_VAULT, activity: activity() };
        const query = String(input.query ?? "");
        const matcher = query ? searchMatcher(query, input.regex === true) : null;
        if (!matcher) return { output: query ? `"${query}" isn't a valid regular expression.` : "Say what to search for.", activity: activity("refused") };
        const folder = guardFolderPath(String(input.folder ?? ""));
        if (!folder.ok) return { output: folder.reason, activity: activity("refused") };
        const limit = Math.min(100, Math.max(1, Number(input.limit) || SEARCH_DEFAULT_LIMIT));
        const all = searchablePaths(store.get(atom_fileMetadata), store.get(atom_vaultTextFiles).map((file) => file.path), folder.path);
        const paths = all.slice(0, SEARCH_MAX_FILES);
        const hits: SearchMatch[] = [];
        let scanned = 0;
        for (const path of paths) {
          if (hits.length >= limit) break;
          scanned++;
          try {
            hits.push(...matchesIn(path, await readCurrentText(path), matcher, limit - hits.length));
          } catch {
            // Unreadable files are skipped.
          }
        }
        const output = searchFilesOutput(query, hits, { limit, truncated: scanned < all.length && hits.length < limit, scanned });
        return { output, activity: activity(`${hits.length} found`) };
      }
      if (toolName === "find_files") {
        if (!store.get(atom_vaultHandle)) return { output: NO_VAULT, activity: activity() };
        const pattern = String(input.pattern ?? "").trim();
        if (!pattern) return { output: "Say which file names to look for.", activity: activity("refused") };
        const limit = Math.min(200, Math.max(1, Number(input.limit) || 50));
        const matches = globMatcher(pattern);
        const found = searchablePaths(store.get(atom_fileMetadata), store.get(atom_vaultTextFiles).map((file) => file.path), "").filter(matches);
        return { output: findFilesOutput(pattern, found, limit), activity: activity(`${found.length} found`) };
      }
      if (toolName === "edit_file") {
        const edits = Array.isArray(input.edits) ? (input.edits as FindReplace[]) : [];
        const { output, detail } = await writes.editFile(turnId, String(input.path ?? ""), edits);
        return { output, activity: activity(detail) };
      }
      if (toolName === "create_file") {
        const { output, detail } = await writes.createFile(turnId, String(input.path ?? ""), String(input.content ?? ""));
        return { output, activity: activity(detail) };
      }
      if (toolName === "create_folder") {
        const { output, detail } = await writes.createFolder(turnId, String(input.path ?? ""));
        return { output, activity: activity(detail) };
      }
      if (toolName === "create_template") {
        const { output, detail } = await writes.createTemplate(turnId, String(input.name ?? ""), String(input.body ?? ""));
        return { output, activity: activity(detail) };
      }
      if (toolName === "rename") {
        const { output, detail } = await organise.rename(turnId, String(input.path ?? ""), String(input.newName ?? ""));
        return { output, activity: activity(detail) };
      }
      if (toolName === "move") {
        const { output, detail } = await organise.move(turnId, stringList(input.paths), String(input.folder ?? ""));
        return { output, activity: activity(detail) };
      }
      if (toolName === "trash") {
        const { output, detail } = await organise.trash(turnId, toolCallId || `${turnId}:trash`, stringList(input.paths));
        return { output, activity: activity(detail) };
      }
      return { output: `Unknown tool ${toolName}.`, activity: activity() };
    } catch (err) {
      console.warn("Companion: tool failed", toolName, err);
      return { output: `${toolName} failed: ${err instanceof Error ? err.message : String(err)}`, activity: activity("failed") };
    }
  }, [store, runNoteTool, readCurrentText, writes, organise]);

  return { runTool, undoTurn: writes.undoTurn };
}
