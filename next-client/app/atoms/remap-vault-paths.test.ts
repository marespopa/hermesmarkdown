import { createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import {
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_fileMetadata,
  atom_fileTreeExpansion,
  atom_forgetFileTreePaths,
  atom_liveHandles,
  atom_openFiles,
  atom_remapVaultPaths,
  atom_revealedSensitivePaths,
  atom_vaultHandle,
  atom_workspaceLayout,
  remapPath,
  remapPathsInLayout,
} from "./atoms";
import type { FileMetadata } from "./metadata";
import type { PanelLeaf } from "@/app/types/workspace";

const remapNoteContent = vi.hoisted(() => vi.fn());
vi.mock("@/app/services/content-search-client", () => ({ remapNoteContent }));

describe("remapPath", () => {
  it("maps the path itself and descendants", () => {
    expect(remapPath("a/b", "a/b", "x")).toBe("x");
    expect(remapPath("a/b/c.md", "a/b", "x/y")).toBe("x/y/c.md");
  });

  it("ignores siblings that only share a name prefix", () => {
    expect(remapPath("a/bc/c.md", "a/b", "x")).toBeNull();
    expect(remapPath("a", "a/b", "x")).toBeNull();
  });
});

describe("remapPathsInLayout", () => {
  it("maps tabs and the active tab in every pane, without duplicates", () => {
    const layout = {
      id: "root",
      direction: "horizontal" as const,
      sizes: [50, 50],
      children: [
        { id: "p1", type: "editor" as const, isPinned: false, openFilePaths: ["a/x.md", "b.md"], activeFilePath: "a/x.md" },
        { id: "p2", type: "editor" as const, isPinned: false, openFilePaths: ["a/x.md", "z/x.md"], activeFilePath: "z/x.md" },
      ],
    };
    const result = remapPathsInLayout(layout, (p) => remapPath(p, "a", "z") ?? p) as typeof layout;
    expect(result.children[0]).toMatchObject({ openFilePaths: ["z/x.md", "b.md"], activeFilePath: "z/x.md" });
    expect(result.children[1].openFilePaths).toEqual(["z/x.md"]);
  });
});

const meta = (path: string): FileMetadata => ({
  path,
  name: path.split("/").pop()!,
  tags: [],
  links: [],
  frontmatter: {},
  modifiedAt: 0,
  wordCount: 0,
  tasks: [],
  handle: null,
});

describe("atom_remapVaultPaths", () => {
  let store: ReturnType<typeof createStore>;
  let vault: MemoryDirectoryHandle;

  beforeEach(async () => {
    localStorage.clear();
    store = createStore();
    vault = new MemoryDirectoryHandle("vault");
    // State after the folder "notes" was renamed to "archive" on disk.
    await vault.writeText("archive/deep/idea.md", "saved");
    store.set(atom_vaultHandle, vault.asHandle());
    store.set(atom_openFiles, {
      draft: { content: "", lastSavedContent: "", fileName: "untitled", activeFilePath: null },
      "notes/deep/idea.md": {
        content: "unsaved edit",
        lastSavedContent: "saved",
        fileName: "idea",
        activeFilePath: "notes/deep/idea.md",
      },
      "notes-old.md": { content: "", lastSavedContent: "", fileName: "notes-old", activeFilePath: "notes-old.md" },
    });
    store.set(atom_workspaceLayout, {
      rootContainer: {
        id: "default-pane",
        type: "editor",
        isPinned: false,
        openFilePaths: ["notes/deep/idea.md", "notes-old.md"],
        activeFilePath: "notes/deep/idea.md",
      },
    });
    store.set(atom_fileMetadata, {
      "notes/deep/idea.md": meta("notes/deep/idea.md"),
      "notes-old.md": meta("notes-old.md"),
    });
    store.set(atom_fileTreeExpansion, {
      "local:vault": { expanded: ["notes", "notes/deep", "notes-old"], collapsed: [] },
    });
  });

  it("re-keys tabs under a renamed folder, keeping unsaved edits", async () => {
    await store.set(atom_remapVaultPaths, { oldPath: "notes", newPath: "archive" });

    const openFiles = store.get(atom_openFiles);
    expect(openFiles["notes/deep/idea.md"]).toBeUndefined();
    expect(openFiles["archive/deep/idea.md"]).toMatchObject({
      content: "unsaved edit",
      lastSavedContent: "saved",
      fileName: "idea",
      activeFilePath: "archive/deep/idea.md",
    });
    expect(openFiles["notes-old.md"]).toBeDefined();

    const leaf = store.get(atom_workspaceLayout).rootContainer as PanelLeaf;
    expect(leaf.openFilePaths).toEqual(["archive/deep/idea.md", "notes-old.md"]);
    expect(store.get(atom_activeFilePath)).toBe("archive/deep/idea.md");
  });

  it("gives moved tabs a fresh handle at the new path", async () => {
    await store.set(atom_remapVaultPaths, { oldPath: "notes", newPath: "archive" });

    expect(store.get(atom_activeFileHandle)).toBe(vault.fileAt("archive/deep/idea.md"));
    expect(store.get(atom_liveHandles("notes/deep/idea.md"))).toBeNull();
  });

  it("re-keys metadata and remembered folder expansion", async () => {
    await store.set(atom_remapVaultPaths, { oldPath: "notes", newPath: "archive" });

    expect(Object.keys(store.get(atom_fileMetadata)).sort()).toEqual(["archive/deep/idea.md", "notes-old.md"]);
    expect(store.get(atom_fileMetadata)["archive/deep/idea.md"].path).toBe("archive/deep/idea.md");
    expect(store.get(atom_fileTreeExpansion)["local:vault"].expanded).toEqual(["archive", "archive/deep", "notes-old"]);
  });

  it("remaps the note-text index before the metadata update", async () => {
    let keysAtRemap: string[] = [];
    remapNoteContent.mockImplementationOnce(() => { keysAtRemap = Object.keys(store.get(atom_fileMetadata)).sort(); });

    await store.set(atom_remapVaultPaths, { oldPath: "notes", newPath: "archive" });

    expect(remapNoteContent).toHaveBeenCalledWith("notes", "archive");
    expect(keysAtRemap).toEqual(["notes-old.md", "notes/deep/idea.md"]);
  });

  it("updates the tab name when the file itself is renamed", async () => {
    await vault.writeText("notes/deep/plan.md", "saved");
    await store.set(atom_remapVaultPaths, { oldPath: "notes/deep/idea.md", newPath: "notes/deep/plan.md" });

    expect(store.get(atom_openFiles)["notes/deep/plan.md"].fileName).toBe("plan");
  });

  it("keeps sensitive-note session reveals across a folder move and a file rename", async () => {
    store.set(atom_revealedSensitivePaths, new Set(["notes/deep/idea.md", "notes-old.md"]));

    await store.set(atom_remapVaultPaths, { oldPath: "notes", newPath: "archive" });
    expect([...store.get(atom_revealedSensitivePaths)].sort()).toEqual(["archive/deep/idea.md", "notes-old.md"]);

    await vault.writeText("archive/deep/plan.md", "saved");
    await store.set(atom_remapVaultPaths, { oldPath: "archive/deep/idea.md", newPath: "archive/deep/plan.md" });
    expect([...store.get(atom_revealedSensitivePaths)].sort()).toEqual(["archive/deep/plan.md", "notes-old.md"]);
  });

  it("forgets expansion for a deleted folder and its descendants only", () => {
    store.set(atom_forgetFileTreePaths, "notes");
    expect(store.get(atom_fileTreeExpansion)["local:vault"].expanded).toEqual(["notes-old"]);
  });
});
