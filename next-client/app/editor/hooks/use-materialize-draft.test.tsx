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
import { atom_draftFolderDeclined, atom_draftFolderRequest, atom_newNoteFolder, type DraftFolderRequest } from "@/app/atoms/ui-atoms";
import { useMaterializeDraft } from "./use-materialize-draft";

const { writeFileContent } = vi.hoisted(() => ({ writeFileContent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/services/file-writer", () => ({ writeFileContent }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

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

// Answers the folder picker: the preselected default unless `pick` says
// otherwise (null = dismissed). Records each request.
function answerPicker(store: ReturnType<typeof createStore>, pick: (req: DraftFolderRequest) => string | null) {
  const requests: DraftFolderRequest[] = [];
  store.sub(atom_draftFolderRequest, () => {
    const req = store.get(atom_draftFolderRequest);
    if (!req) return;
    requests.push(req);
    queueMicrotask(() => req.resolve(pick(req)));
  });
  return requests;
}

function setup(
  draftContent: string,
  { activePath = "draft", existing = [] as string[], pick = (req: DraftFolderRequest): string | null => req.defaultFolder } = {},
) {
  const store = createStore();
  const vault = fakeDir("vault", existing);
  store.set(atom_vaultHandle, vault);
  store.set(atom_isVaultRestoring, false);
  store.set(atom_activePaneId, "pane");
  store.set(atom_workspaceLayout, {
    rootContainer: { id: "pane", type: "editor", openFilePaths: ["other.md", "draft"], activeFilePath: activePath, isPinned: false },
  });
  store.set(atom_openFiles, { draft: { ...EMPTY_DRAFT, content: draftContent } });
  const requests = answerPicker(store, pick);
  const scanVault = vi.fn().mockResolvedValue(undefined);
  const indexVaultTags = vi.fn().mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useMaterializeDraft({ scanVault, indexVaultTags }), { wrapper });
  return { store, vault, result, scanVault, requests };
}

describe("useMaterializeDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it("never overwrites an existing note", async () => {
    const { result } = setup("Plan\n", { existing: ["Plan.md"] });
    let path: string | null = null;
    await act(async () => { path = await result.current(); });
    expect(path).toBe("Plan (1).md");
  });

  it("preselects the configured folder in the picker", async () => {
    const { store, vault, result, requests } = setup("Idea\n");
    store.set(atom_newNoteFolder, "/inbox/");
    let path: string | null = null;
    await act(async () => { path = await result.current(); });
    expect(requests[0]).toMatchObject({ defaultFolder: "inbox", folders: ["inbox"] });
    expect(path).toBe("inbox/Idea.md");
    expect(vault.dirs.get("inbox").files.has("Idea.md")).toBe(true);
  });

  it("offers the vault's folders and saves into the one picked", async () => {
    const { vault, result, requests } = setup("Idea\n", { pick: () => "work/meetings" });
    vault.dirs.set("work", fakeDir("work"));
    vault.dirs.get("work").dirs.set("meetings", fakeDir("meetings"));
    vault.dirs.set(".git", fakeDir(".git"));
    let path: string | null = null;
    await act(async () => { path = await result.current(); });
    expect(requests[0].folders).toEqual(["work", "work/meetings"]);
    expect(path).toBe("work/meetings/Idea.md");
  });

  it("keeps the draft when the picker is dismissed, and only an explicit save asks again", async () => {
    const { store, result, requests } = setup("Idea\n", { pick: () => null });
    let path: string | null = "x";
    await act(async () => { path = await result.current(); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
    expect(store.get(atom_openFiles).draft.content).toBe("Idea\n");
    expect(store.get(atom_draftFolderDeclined)).toBe(true);

    await act(async () => { await result.current(undefined, { background: true }); });
    expect(requests).toHaveLength(1);

    await act(async () => { await result.current(); });
    expect(requests).toHaveLength(2);
  });

  it("writes nothing for a whitespace-only draft", async () => {
    const { result } = setup("  \n\n");
    let path: string | null = "x";
    await act(async () => { path = await result.current(); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("doesn't ask for a folder until the vault is restored", async () => {
    const { store, result, requests } = setup("Trip ideas\nbody");
    store.set(atom_isVaultRestoring, true);
    await act(async () => expect(await result.current()).toBeNull());
    store.set(atom_isVaultRestoring, false);
    store.set(atom_isVaultPending, true);
    await act(async () => expect(await result.current()).toBeNull());
    expect(requests).toHaveLength(0);
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("does nothing when the active tab isn't the draft", async () => {
    const { result } = setup("Idea\n", { activePath: "other.md" });
    let path: string | null = "x";
    await act(async () => { path = await result.current(); });
    expect(path).toBeNull();
    expect(writeFileContent).not.toHaveBeenCalled();
  });

  it("creates one file when saves overlap", async () => {
    const { vault, result } = setup("Once\n");
    await act(async () => { await Promise.all([result.current(), result.current()]); });
    expect([...vault.files]).toEqual(["Once.md"]);
  });
});
