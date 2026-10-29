"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { atom_isCloudVault, atom_vaultDescriptor, atom_vaultFolderPaths, atom_vaultHandle, atom_vaultTextFiles } from "@/app/atoms/vault-atoms";
import { atom_projectCheckUiState } from "@/app/atoms/companion-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { NOTE_TOOL_DEFS } from "@/app/services/note-tool-defs";
import type { CompanionToolName } from "@/app/services/companion-tool-defs";
import type { ProjectCheckId } from "@/app/services/project-checks";
import { useChatSkills } from "../ai-chat/use-chat-skills";
import { useNoteTools, type NoteToolResult } from "../ai-chat/use-note-tools";
import { guardFilePath, guardFolderPath } from "./tools/path-guard";
import { useCompanionOrganise } from "./use-companion-organise";
import { useCompanionWrites } from "./use-companion-writes";
import type { FindReplace } from "./tools/edit-tools";
import { startChangesScan } from "@/app/services/git-changes-client";
import { loadYaml } from "@/app/utils/load-yaml";
import { createLinkResolver } from "@/app/utils/note-links/link-resolver";
import { checkFileOutput } from "./tools/check-tools";
import { projectCheckById, isProjectCheckAvailable, PROJECT_CHECK_MAX_OUTPUT_CHARS } from "@/app/services/project-checks";
import { projectCheckPairing, runProjectCheck } from "@/app/services/project-check-helper-client";
import { requestProjectCheckApproval } from "./project-check-approval";
import { trackProjectCheckAbort } from "./companion-chat-store";
import { gitDiffOutput, gitStatusOutput } from "./tools/git-tools";
import { findFilesOutput, globMatcher, matchesIn, planOutput, searchFilesOutput, searchMatcher, searchablePaths, SEARCH_DEFAULT_LIMIT, SEARCH_MAX_FILES, type SearchMatch } from "./tools/search-tools";
import { activeNoteOutput, codeBlockAt, companionToolActivity, listFolderOutput, readFileOutput } from "./tools/read-tools";

const NO_VAULT = "No vault is open, so there are no files to look at. Ask the user to open a folder.";

// A tool call to run: its name, input and id (trash's card is shown by it).
export type CompanionToolCall = { toolName: string; input: unknown; toolCallId?: string };
export type ActiveSkillPolicy = { tools?: CompanionToolName[]; checks?: ProjectCheckId[] };

const stringList = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

// Runs the companion's tool calls in the browser: the note tools through
// useNoteTools, the vault and editor read tools (list_folder, read_file,
// get_active_note, search_files, find_files, check_file, git_status, git_diff, update_plan) here, behind the path guard, load_skill through
// useChatSkills, the writes (edit_file, write_file,
// edit_code_block, create_file, create_folder, create_template) through
// useCompanionWrites and the organising tools (rename, move, trash) through
// useCompanionOrganise, recorded in the turn's undo group (`turnId`, the id
// of the user message that started it). Every call
// answers `{ output, activity }`: the text sent back to the model and the
// line its chip shows. A failed call answers its reason; it never throws.
export function useCompanionTools() {
  const store = useStore();
  const { runTool: runNoteTool } = useNoteTools();
  const { readCurrentText } = useNoteBuffer();
  const { loadSkill } = useChatSkills();
  const writes = useCompanionWrites();
  const organise = useCompanionOrganise();

  const runTool = useCallback(async ({ toolName, input: rawInput, toolCallId = "" }: CompanionToolCall, turnId = "turn", policy?: ActiveSkillPolicy): Promise<NoteToolResult> => {
    const input = (rawInput ?? {}) as Record<string, unknown>;
    const activity = (detail = "") => companionToolActivity(toolName, input, detail);
    if (policy?.tools && !policy.tools.includes(toolName as CompanionToolName)) {
      return { output: `The active skill does not bind to ${toolName}.`, activity: activity("skill restriction") };
    }
    if (toolName === "run_project_check" && policy?.checks && !policy.checks.includes(String(input.checkId) as ProjectCheckId)) {
      return { output: "The active skill does not bind to that project check.", activity: activity("skill restriction") };
    }
    try {
      if (toolName === "run_project_check") {
        const check = projectCheckById(input.checkId);
        if (!check) return { output: "That project check is not in the fixed allowlist.", activity: activity("refused") };
        const vault = store.get(atom_vaultHandle);
        const descriptor = store.get(atom_vaultDescriptor);
        const paired = projectCheckPairing();
        const mobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const availability = isProjectCheckAvailable({
          hasVault: !!vault && !store.get(atom_isCloudVault),
          browserVault: descriptor?.kind === "browser",
          mobile,
          paired: paired.paired,
        });
        const baseState = {
          toolCallId: toolCallId || `${turnId}:project-check`, checkId: check.id, label: check.label,
          argv: [...check.argv], projectRoot: paired.projectRoot ?? "No helper paired", timeoutMs: check.timeoutMs,
          status: availability.available ? "approval" as const : "unavailable" as const, output: "",
        };
        if (!availability.available) {
          store.set(atom_projectCheckUiState, { ...baseState, detail: availability.reason });
          return { output: availability.reason ?? "Project checks are unavailable. Use check_file for syntax checks.", activity: activity("unavailable") };
        }
        const approved = await requestProjectCheckApproval(store, baseState);
        if (!approved) return { output: "The user did not approve this project check. No local process was started.", activity: activity("denied") };
        const currentPairing = projectCheckPairing();
        if (!currentPairing.paired || currentPairing.projectRoot !== paired.projectRoot || currentPairing.generation !== paired.generation) {
          store.set(atom_projectCheckUiState, { ...baseState, status: "disconnected", detail: "The helper pairing changed. Pair it again and request approval for a new invocation." });
          return { output: "The helper pairing changed while approval was pending. No local process was started; request a new approved check.", activity: activity("pairing changed") };
        }
        const controller = new AbortController();
        const untrack = trackProjectCheckAbort(controller);
        try {
          const result = await runProjectCheck(check.id, {
            signal: controller.signal,
            onOutput: (line) => store.set(atom_projectCheckUiState, (current) => current?.toolCallId === baseState.toolCallId
              ? { ...current, output: `${current.output}${line}`.slice(-PROJECT_CHECK_MAX_OUTPUT_CHARS) } : current),
          });
          store.set(atom_projectCheckUiState, { ...baseState, status: result.status, output: result.output, exitCode: result.exitCode, durationMs: result.durationMs, detail: result.error });
          const diagnostics = result.output.slice(0, 8_000);
          const output = `Local project check ${check.label}: ${result.status}${result.exitCode === null ? "" : ` (exit code ${result.exitCode})`}.${result.error ? ` ${result.error}` : ""}${diagnostics ? `\nBounded, redacted local output:\n${diagnostics}` : ""}`;
          return { output, activity: activity(result.status.replaceAll("_", " ")) };
        } finally { untrack(); }
      }
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
      if (toolName === "check_file") {
        if (!store.get(atom_vaultHandle)) return { output: NO_VAULT, activity: activity() };
        const guarded = guardFilePath(String(input.path ?? ""));
        if (!guarded.ok) return { output: guarded.reason, activity: activity("refused") };
        const meta = store.get(atom_fileMetadata);
        if (isPrivateFrontmatter(meta[guarded.path]?.frontmatter)) return { output: readFileOutput(guarded.path, meta[guarded.path], null), activity: activity("private") };
        let text: string | null = null;
        try {
          text = await readCurrentText(guarded.path);
        } catch (err) {
          console.warn("Companion: couldn't read", guarded.path, err);
        }
        if (text === null) return { output: readFileOutput(guarded.path, undefined, null), activity: activity("not found") };
        if (isPrivateContent(text) && guarded.path.endsWith(".md")) return { output: readFileOutput(guarded.path, undefined, text), activity: activity("private") };
        const resolver = createLinkResolver(meta);
        const output = await checkFileOutput(guarded.path, text, { load: await loadYaml(), linkExists: (name) => !!resolver.resolve(name, guarded.path) });
        return { output, activity: activity(output.includes("no syntax problems") ? "ok" : "problems") };
      }
      if (toolName === "git_status" || toolName === "git_diff") {
        const vault = store.get(atom_vaultHandle);
        if (!vault) return { output: NO_VAULT, activity: activity() };
        const meta = store.get(atom_fileMetadata);
        const isPrivatePath = (path: string) => isPrivateFrontmatter(meta[path]?.frontmatter);
        const result = await startChangesScan(vault, () => {}).result;
        const output = toolName === "git_status"
          ? gitStatusOutput(result, isPrivatePath)
          : gitDiffOutput(result, String(input.path ?? "").replace(/^\/+|\/+$/g, ""), isPrivatePath);
        return { output, activity: activity() };
      }
      if (toolName === "update_plan") {
        const { output, detail } = planOutput(input.steps);
        return { output, activity: activity(detail) };
      }
      if (toolName === "write_file") {
        const { output, detail } = await writes.writeFile(turnId, String(input.path ?? ""), String(input.content ?? ""));
        return { output, activity: activity(detail) };
      }
      if (toolName === "load_skill") {
        const name = String(input.name ?? "");
        const text = await loadSkill(name);
        if (text) return { output: `--- SKILL ${name} ---\n${text}\n--- END SKILL ---`, activity: activity() };
        return { output: `There's no skill ${name}. Use one of the skills listed in your instructions.`, activity: activity("not found") };
      }
      if (toolName === "edit_file") {
        const edits = Array.isArray(input.edits) ? (input.edits as FindReplace[]) : [];
        const { output, detail } = await writes.editFile(turnId, String(input.path ?? ""), edits);
        return { output, activity: activity(detail) };
      }
      if (toolName === "edit_code_block") {
        const target = {
          index: typeof input.index === "number" ? input.index : undefined,
          lang: typeof input.lang === "string" ? input.lang : undefined,
          firstLine: typeof input.firstLine === "string" ? input.firstLine : undefined,
        };
        const { output, detail } = await writes.editCodeBlock(turnId, String(input.path ?? ""), target, String(input.code ?? ""));
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
  }, [store, runNoteTool, readCurrentText, loadSkill, writes, organise]);

  return { runTool, undoTurn: writes.undoTurn };
}
