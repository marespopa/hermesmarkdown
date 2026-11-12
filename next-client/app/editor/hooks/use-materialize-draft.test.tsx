import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import {
  atom_activePaneId,
  atom_isVaultPending,
  atom_isVaultRestoring,
  atom_liveHandles,
  atom_materializedDraftPath,
  atom_openFiles,
  atom_vaultHandle,
  atom_workspaceLayout,
  EMPTY_DRAFT,
} from "@/app/atoms/atoms";
import { useMaterializeDraft } from "./use-materialize-draft";

const { writeFileContent } = vi.hoisted(() => ({ writeFileContent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/services/file-writer", () => ({ writeFileContent }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
// The folder question: the vault root unless a test answers otherwise.
const askSaveFolder = vi.fn();
vi.mock("@/app/hooks/file-system/use-ask-save-folder", () => ({ useAskSaveFolder: () => askSaveFolder }));

function notFound() {
  return Object.assign(new Error("missing"), { name: "NotFoundError" });
}

function fakeDir(name: string, existing: string[] = []): any {
  const files = new Set(existing);
  const dirs = new Map<string, any>();
  return {
    kind: "directory",
    name,
    files,
    dirs,
    getFileHandle: vi.fn(async (fileName: string, opts?: { create?: boolean }) => {
      if (!files.has(fileName) && !opts?.create) throw notFound();
      files.add(fileName);
      return { kind: "file", name: fileName, getFile: async () => ({ lastModified: 123 }) };
    }),
    getDirectoryHandle: vi.fn(async (dirName: string) => {
      if (!dirs.has(dirName)) dirs.set(dirName, fakeDir(dirName));
      return dirs.get(dirName);
    }),
    values: async function* () {
      yield* dirs.values();
    },
  };
}

function setup(
  draftContent: string,
  { activePath = "draft", existing = [] as string[] } = {},
) {
  const store = createStore();
  const vault = fakeDir("vault", existing);
  store.set(atom_vaultHandle, vault);
  store.set(atom_isVaultRestoring, false);
  store.set(atom_activePaneId, "pane");
  store.set(atom_workspaceLayout, {
    rootContainer: { id: "pane", openFilePaths: ["other.md", "draft"], activeFilePath: activePath, isPinned: false },
  });
  store.set(atom_openFiles, { draft: { ...EMPTY_DRAFT, content: draftContent } });
  const scanVault = vi.fn().mockResolvedValue(undefined);
  const indexVaultTags = vi.fn().mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useMaterializeDraft({ scanVault, indexVaultTags }), { wrapper });
  return { store, vault, result, scanVault };
}

describe("useMaterializeDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    askSaveFolder.mockResolvedValue("");
  });

  it("saves the draft named after its first line and turns the tab into that file", async () => {
    const { store, vault, result, scanVault } = setup("# Trip ideas\nLisbon\n");
    let path: string | null = null;
    await act(async () => { path = await result.current(); });

    expect(path).toBe("Trip ideas.md");
    expect(vault.files.has("Trip ideas.md")).toBe(true);
    expect(writeFileContent).toHaveBeenCalledWith(expect.objectContaining({ name: "Trip ideas.md" }), "# Trip ideas\nLisbon\n");
    expect(scanVault).toHaveBeenCalledWith(vault);

    const leaf = store.get(atom_workspaceLayout).rootContainer as any;
    expect(leaf.openFilePaths).toEqual(["other.md", "Trip ideas.md"]);
    expect(leaf.activeFilePath).toBe("Trip ideas.md");

    const files = store.get(atom_openFiles);
    expect(files["Trip ideas.md"]).toMatchObject({ content: "# Trip ideas\nLisbon\n", lastSavedContent: "# Trip ideas\nLisbon\n", fileName: "Trip ideas.md" });
    expect(files.draft.content).toBe("");
    expect(store.get(atom_liveHandles("Trip ideas.md"))).not.toBeNull();
    expect(store.get(atom_materializedDraftPath)).toBe("Trip ideas.md");
  });

  it("never overwrites an existing note or loses the draft's text", async () => {
    const { result } = setup("Plan\n", { existing: ["Plan.md"] });
    let path: string | null = null;
    await act(async () => { path = await result.current(); });
    expect(path).toBe("Plan (1).md");
  });

  it("asks for the folder and saves into the one picked", async () => {
    askSaveFolder.mockResolvedValue("inbox");
    const { vault, result } = setup("Idea\n");
    let path: string | null = null;
    await act(async () => { path = await result.current(); });
    expect(askSaveFolder).toHaveBeenCalledWith('Save "Idea.md"');
    expect(path).toBe("inbox/Idea.md");
    expect(vault.dirs.get("inbox").files.has("Idea.md")).toBe(true);
  });

  it("writes nothing and keeps the draft when the folder question is cancelled", async () => {
    askSaveFolder.mockResolvedValue(null);
    const { store, result } = setup("Idea\n");
    let path: string | null = "x";
    await act(async () => { path = await result.current(); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(store.get(atom_openFiles).draft.content).toBe("Idea\n");
    expect((store.get(atom_workspaceLayout).rootContainer as any).activeFilePath).toBe("draft");
  });

  it("saves text typed while the folder question was open", async () => {
    const { store, result } = setup("Idea\n");
    askSaveFolder.mockImplementation(async () => {
      store.set(atom_openFiles, { draft: { ...EMPTY_DRAFT, content: "Idea\nmore\n" } });
      return "";
    });
    await act(async () => { await result.current(); });
    expect(writeFileContent).toHaveBeenCalledWith(expect.objectContaining({ name: "Idea.md" }), "Idea\nmore\n");
  });

  it("asks once on autosave: after a cancel only a save the user asks for asks again", async () => {
    askSaveFolder.mockResolvedValue(null);
    const { result } = setup("Idea\n");
    await act(async () => { await result.current(undefined, { auto: true }); });
    await act(async () => { await result.current(undefined, { auto: true }); });
    expect(askSaveFolder).toHaveBeenCalledOnce();

    askSaveFolder.mockResolvedValue("");
    let path: string | null = null;
    await act(async () => { path = await result.current(); });
    expect(askSaveFolder).toHaveBeenCalledTimes(2);
    expect(path).toBe("Idea.md");
  });

  it("writes nothing for a whitespace-only draft", async () => {
    const { result } = setup("  \n\n");
    let path: string | null = "x";
    await act(async () => { path = await result.current(); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("doesn't save until the vault is restored", async () => {
    const { store, result } = setup("Trip ideas\nbody");
    store.set(atom_isVaultRestoring, true);
    await act(async () => expect(await result.current()).toBeNull());
    store.set(atom_isVaultRestoring, false);
    store.set(atom_isVaultPending, true);
    await act(async () => expect(await result.current()).toBeNull());
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("does nothing when the active tab isn't the draft", async () => {
    const { result } = setup("Idea\n", { activePath: "other.md" });
    let path: string | null = "x";
    await act(async () => { path = await result.current(); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("asks once and creates one file when saves overlap", async () => {
    const { vault, result } = setup("Once\n");
    await act(async () => { await Promise.all([result.current(), result.current()]); });
    expect(askSaveFolder).toHaveBeenCalledOnce();
    expect([...vault.files]).toEqual(["Once.md"]);
  });
});
