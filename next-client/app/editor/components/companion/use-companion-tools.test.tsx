import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFolderPaths, atom_vaultHandle, atom_vaultTextFiles, atom_vaultDescriptor } from "@/app/atoms/vault-atoms";
import { atom_projectCheckUiState } from "@/app/atoms/companion-atoms";
import { useCompanionTools } from "./use-companion-tools";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const runNoteTool = vi.fn();
vi.mock("../ai-chat/use-note-tools", () => ({ useNoteTools: () => ({ runTool: runNoteTool }) }));
const loadSkill = vi.fn();
vi.mock("../ai-chat/use-chat-skills", () => ({ useChatSkills: () => ({ loadSkill }) }));
const readCurrentText = vi.fn();
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({ useNoteBuffer: () => ({ readCurrentText }) }));
const editFile = vi.fn();
const writeFile = vi.fn();
const scanResult = vi.fn();
const projectCheckPairing = vi.fn();
const runProjectCheck = vi.fn();
vi.mock("@/app/services/project-check-helper-client", () => ({ projectCheckPairing: () => projectCheckPairing(), runProjectCheck: (...args: unknown[]) => runProjectCheck(...args) }));
const requestProjectCheckApproval = vi.fn();
const trackedControllers: AbortController[] = [];
vi.mock("./project-check-approval", () => ({ requestProjectCheckApproval: (...args: unknown[]) => requestProjectCheckApproval(...args) }));
vi.mock("./companion-chat-store", () => ({ trackProjectCheckAbort: (controller: AbortController) => { trackedControllers.push(controller); return vi.fn(); } }));
vi.mock("@/app/services/git-changes-client", () => ({ startChangesScan: () => ({ result: scanResult(), cancel: vi.fn() }) }));
const createTemplate = vi.fn();
vi.mock("./use-companion-writes", () => ({
  useCompanionWrites: () => ({ editFile, writeFile, editCodeBlock: vi.fn(), createFile: vi.fn(), createFolder: vi.fn(), createTemplate, undoTurn: vi.fn() }),
}));
const move = vi.fn();
const trash = vi.fn();
vi.mock("./use-companion-organise", () => ({ useCompanionOrganise: () => ({ rename: vi.fn(), move, trash }) }));

const note = (path: string, frontmatter: Record<string, unknown> = {}): FileMetadata => ({
  path, name: path.split("/").pop()!, tags: [], links: [], frontmatter, modifiedAt: 0, wordCount: 0, tasks: [], handle: null,
});

function setup({ vault = true, browserVault = false } = {}) {
  const store = createStore();
  if (vault) store.set(atom_vaultHandle, {} as FileSystemDirectoryHandle);
  store.set(atom_vaultDescriptor, browserVault ? { kind: "browser", id: "test", displayName: "Test" } as never : { kind: "local" });
  store.set(atom_fileMetadata, {
    "Projects/Roadmap.md": note("Projects/Roadmap.md"),
    "Projects/Budget.md": note("Projects/Budget.md", { private: true }),
  });
  store.set(atom_vaultTextFiles, [{ path: "Projects/build.py", handle: {} as FileSystemFileHandle }]);
  store.set(atom_vaultFolderPaths, ["Projects"]);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useCompanionTools(), { wrapper });
  return { ...result.current, store };
}

describe("useCompanionTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trackedControllers.length = 0;
    runNoteTool.mockResolvedValue({ output: "1 note matches", activity: "Searched notes" });
    readCurrentText.mockResolvedValue("print('ok')");
    projectCheckPairing.mockReturnValue({ paired: false, projectRoot: null });
    requestProjectCheckApproval.mockResolvedValue(true);
    runProjectCheck.mockResolvedValue({ status: "completed", exitCode: 0, durationMs: 4, output: "checks passed" });
  });

  it("hands the note tools to useNoteTools", async () => {
    const tools = setup();

    const result = await tools.runTool({ toolName: "search_notes", input: { query: "roadmap" } });

    expect(runNoteTool).toHaveBeenCalledWith({ toolName: "search_notes", input: { query: "roadmap" } });
    expect(result.output).toBe("1 note matches");
  });

  it("loads a skill's text, or says there's no such skill", async () => {
    loadSkill.mockResolvedValueOnce("Skill: work with tasks.").mockResolvedValueOnce(null);
    const tools = setup();

    const found = await tools.runTool({ toolName: "load_skill", input: { name: "/tasks" } });
    const missing = await tools.runTool({ toolName: "load_skill", input: { name: "/nope" } });

    expect(loadSkill).toHaveBeenCalledWith("/tasks");
    expect(found.output).toBe("--- SKILL /tasks ---\nSkill: work with tasks.\n--- END SKILL ---");
    expect(found.activity).toBe("Loaded the skill /tasks");
    expect(missing.output).toContain("There's no skill /nope");
    expect(missing.activity).toBe("Loaded the skill /nope · not found");
  });

  it("lists a folder from the vault's lists", async () => {
    const result = await setup().runTool({ toolName: "list_folder", input: { path: "Projects" } });

    expect(result.output).toContain("- Projects/build.py");
    expect(result.output).toContain("- Projects/Budget.md (private (hidden))");
    expect(result.activity).toBe("Listed Projects");
  });

  it("reads a code file through the note buffer", async () => {
    const result = await setup().runTool({ toolName: "read_file", input: { path: "./Projects/build.py" } });

    expect(readCurrentText).toHaveBeenCalledWith("Projects/build.py");
    expect(result.output).toContain("print('ok')");
  });

  it("never reads a private note", async () => {
    const result = await setup().runTool({ toolName: "read_file", input: { path: "Projects/Budget.md" } });

    expect(readCurrentText).not.toHaveBeenCalled();
    expect(result.output).toContain("private (hidden)");
  });

  it("refuses the app's data folder", async () => {
    const result = await setup().runTool({ toolName: "read_file", input: { path: ".hermesmarkdown/trash/Old.md" } });

    expect(readCurrentText).not.toHaveBeenCalled();
    expect(result.activity).toContain("refused");
  });

  it("answers without a vault instead of failing", async () => {
    const result = await setup({ vault: false }).runTool({ toolName: "read_file", input: { path: "Projects/Roadmap.md" } });

    expect(result.output).toMatch(/No vault is open/);
  });

  it("hands edits to the writes under the turn", async () => {
    editFile.mockResolvedValue({ output: "Saved Projects/Roadmap.md (1 edit).", detail: "1 edit" });
    const edits = [{ find: "Q3", replace: "Q4" }];

    const result = await setup().runTool({ toolName: "edit_file", input: { path: "Projects/Roadmap.md", edits } }, "turn-1");

    expect(editFile).toHaveBeenCalledWith("turn-1", "Projects/Roadmap.md", edits);
    expect(result.activity).toBe("Edited Projects/Roadmap.md · 1 edit");
  });

  it("answers a read error as the tool's result", async () => {
    readCurrentText.mockRejectedValue(new Error("gone"));

    const result = await setup().runTool({ toolName: "read_file", input: { path: "Projects/Roadmap.md" } });

    expect(result.output).toMatch(/couldn't be read/);
  });

  it("hands the organising tools their turn, and trash its call's id for the card", async () => {
    move.mockResolvedValue({ output: "Moved", detail: "" });
    trash.mockResolvedValue({ output: "The user kept the files", detail: "kept" });
    const tools = setup();

    const moved = await tools.runTool({ toolName: "move", input: { paths: ["Projects/Roadmap.md", "Ideas.md"], folder: "Archive" } }, "turn-1");
    const trashed = await tools.runTool({ toolName: "trash", input: { paths: ["Old.md"] }, toolCallId: "call-7" }, "turn-1");

    expect(move).toHaveBeenCalledWith("turn-1", ["Projects/Roadmap.md", "Ideas.md"], "Archive");
    expect(moved.activity).toBe("Moved 2 items to Archive");
    expect(trash).toHaveBeenCalledWith("turn-1", "call-7", ["Old.md"]);
    expect(trashed.activity).toBe("Moved Old.md to Trash · kept");
  });

  it("hands create_template its name and body", async () => {
    createTemplate.mockResolvedValue({ output: "The template wasn't saved. Fix these…", detail: "needs fixes" });

    const result = await setup().runTool({ toolName: "create_template", input: { name: "RFC", body: "# {{titl}}" } }, "turn-1");

    expect(createTemplate).toHaveBeenCalledWith("turn-1", "RFC", "# {{titl}}");
    expect(result.output).toMatch(/wasn't saved/);
  });

  it("searches files, skipping private notes", async () => {
    readCurrentText.mockImplementation(async (path: string) => (path === "Projects/build.py" ? "import os\nbuild()" : "nothing here"));
    const tools = setup();

    const result = await tools.runTool({ toolName: "search_files", input: { query: "BUILD" } });

    expect(result.output).toContain("Projects/build.py:2: build()");
    expect(readCurrentText).not.toHaveBeenCalledWith("Projects/Budget.md");
  });

  it("refuses a regex that doesn't parse", async () => {
    const tools = setup();

    const result = await tools.runTool({ toolName: "search_files", input: { query: "(", regex: true } });

    expect(result.output).toContain("isn't a valid regular expression");
  });

  it("reads a range of a long file", async () => {
    readCurrentText.mockResolvedValue("a\nb\nc\nd");
    const tools = setup();

    const result = await tools.runTool({ toolName: "read_file", input: { path: "Projects/build.py", startLine: 2, lineCount: 2 } });

    expect(result.output).toContain("b\nc\n[lines 2–3 of 4; call read_file with startLine 4 for the rest]");
  });

  it("writes a whole file in the turn's group", async () => {
    writeFile.mockResolvedValue({ output: "Saved src/a.ts (rewritten).", detail: "rewritten" });
    const tools = setup();

    const result = await tools.runTool({ toolName: "write_file", input: { path: "src/a.ts", content: "x" } }, "turn-1");

    expect(writeFile).toHaveBeenCalledWith("turn-1", "src/a.ts", "x");
    expect(result.activity).toBe("Wrote src/a.ts · rewritten");
  });

  it("answers the plan back with its progress", async () => {
    const tools = setup();

    const result = await tools.runTool({ toolName: "update_plan", input: { steps: [{ text: "Add types", status: "done" }, { text: "Wire it", status: "in_progress" }] } });

    expect(result.output).toBe("Plan, 1 of 2 done:\n[x] Add types\n[~] Wire it");
  });

  it("finds files by name pattern, never private notes", async () => {
    const tools = setup();

    const byName = await tools.runTool({ toolName: "find_files", input: { pattern: "*.py" } });
    const byPath = await tools.runTool({ toolName: "find_files", input: { pattern: "Projects/**/*.md" } });

    expect(byName.output).toBe("1 file matches:\nProjects/build.py");
    expect(byPath.output).toContain("Projects/Roadmap.md");
    expect(byPath.output).not.toContain("Budget");
  });

  it("answers git_status and git_diff from the changes scan", async () => {
    scanResult.mockReturnValue(Promise.resolve({
      status: "ok",
      commit: "abcdef1234",
      files: [{ path: "Projects/build.py", status: "modified", added: 1, removed: 1, diff: { kind: "text", lines: ["b"], changes: [{ oldStart: 1, removed: ["a"], newStart: 1, newCount: 1 }] } }],
    }));
    const tools = setup();

    const status = await tools.runTool({ toolName: "git_status", input: {} });
    const diff = await tools.runTool({ toolName: "git_diff", input: { path: "Projects" } });

    expect(status.output).toContain("M Projects/build.py (+1 −1)");
    expect(diff.output).toContain("@@ -1,1 +1,1 @@\n-a\n+b");
  });

  it("gates project checks for missing vaults, browser vaults and mobile", async () => {
    projectCheckPairing.mockReturnValue({ paired: true, projectRoot: "/repo" });
    const noVault = await setup({ vault: false }).runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } });
    expect(noVault.output).toContain("Open a disk vault");
    const browser = setup({ browserVault: true });
    expect((await browser.runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } })).output).toContain("check_file");
    expect(requestProjectCheckApproval).not.toHaveBeenCalled();
    projectCheckPairing.mockReturnValue({ paired: false, projectRoot: null });
    const unpaired = await setup().runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } });
    expect(unpaired.output).toContain("Pair the local helper");
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" });
    try { expect((await setup().runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } })).output).toContain("mobile"); }
    finally { Object.defineProperty(navigator, "userAgent", { configurable: true, value: original }); }
  });

  it("requires approval for a fixed disk check and rejects arbitrary commands", async () => {
    projectCheckPairing.mockReturnValue({ paired: true, projectRoot: "/repo" });
    const tools = setup();
    const result = await tools.runTool({ toolName: "run_project_check", input: { checkId: "typecheck" }, toolCallId: "call-check" });
    expect(requestProjectCheckApproval).toHaveBeenCalledWith(tools.store, expect.objectContaining({ checkId: "typecheck", argv: ["corepack", "yarn", "tsc", "--noEmit"], projectRoot: "/repo" }));
    expect(runProjectCheck).toHaveBeenCalledWith("typecheck", expect.objectContaining({ signal: expect.any(AbortSignal), onOutput: expect.any(Function) }));
    expect(result.output).toContain("checks passed");
    expect(readCurrentText).not.toHaveBeenCalled();
    const refused = await tools.runTool({ toolName: "run_project_check", input: { checkId: "unknown" } });
    expect(refused.output).toContain("fixed allowlist");
    expect(tools.store.get(atom_projectCheckUiState)?.status).toBe("completed");
  });

  it("does not run after the helper pairing changes during approval", async () => {
    projectCheckPairing.mockReturnValueOnce({ paired: true, projectRoot: "/repo", generation: 1 }).mockReturnValueOnce({ paired: true, projectRoot: "/other", generation: 2 });
    const tools = setup();
    const result = await tools.runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } });
    expect(result.output).toContain("pairing changed");
    expect(runProjectCheck).not.toHaveBeenCalled();
    expect(tools.store.get(atom_projectCheckUiState)?.status).toBe("disconnected");
  });

  it("returns a cancelled status when Stop aborts the local helper", async () => {
    projectCheckPairing.mockReturnValue({ paired: true, projectRoot: "/repo" });
    runProjectCheck.mockImplementationOnce((_id: string, options: { signal: AbortSignal }) => new Promise((resolve) => options.signal.addEventListener("abort", () => resolve({ status: "cancelled", exitCode: null, durationMs: 1, output: "partial" }), { once: true })));
    const tools = setup();
    const pending = tools.runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } });
    await waitFor(() => expect(trackedControllers).toHaveLength(1));
    trackedControllers[0].abort();
    expect((await pending).output).toContain("cancelled");
    expect(tools.store.get(atom_projectCheckUiState)?.status).toBe("cancelled");
  });

  it("keeps a slash skill binding as a hard restriction", async () => {
    const tools = setup();
    const result = await tools.runTool({ toolName: "run_project_check", input: { checkId: "typecheck" } }, "turn", { tools: ["read_file"], checks: ["typecheck"] });
    expect(result.output).toContain("does not bind to run_project_check");
    expect(runProjectCheck).not.toHaveBeenCalled();
  });

  it("checks a file's syntax, never a private note", async () => {
    readCurrentText.mockResolvedValue('{"a": }');
    const tools = setup();

    const broken = await tools.runTool({ toolName: "check_file", input: { path: "Projects/build.json" } });
    const secret = await tools.runTool({ toolName: "check_file", input: { path: "Projects/Budget.md" } });

    expect(broken.output).toContain("1 problem");
    expect(secret.output).toContain("private (hidden)");
  });
});
