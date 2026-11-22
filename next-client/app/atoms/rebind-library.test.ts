import { createStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { CompositeDirectoryHandle, activeMounts } from "@/app/services/library-roots";
import { atom_libraryMounts, atom_openFiles, atom_rebindHandles, atom_vaultHandle } from "./atoms";

vi.mock("@/app/atoms/file-atoms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/atoms/file-atoms")>()),
  isOpenNotesHydrated: () => true,
}));
vi.mock("@/app/services/content-search-client", () => ({ remapNoteContent: vi.fn() }));

const tab = (path: string, content: string) => ({
  content,
  lastSavedContent: "saved",
  fileName: path.split("/").pop()!.replace(".md", ""),
  activeFilePath: path,
});

describe("a library's open notes", () => {
  afterEach(() => createStore().set(atom_vaultHandle, null));

  it("registers the library's folder names when it opens", () => {
    const store = createStore();
    const vault = new MemoryDirectoryHandle("vault").asHandle();
    const library = new CompositeDirectoryHandle(vault, [{ name: "Work", handle: new MemoryDirectoryHandle("Work").asHandle() }]);
    store.set(atom_vaultHandle, library as unknown as FileSystemDirectoryHandle);
    expect(activeMounts()).toEqual(["Work"]);
    expect(store.get(atom_libraryMounts).map((m) => m.name)).toEqual(["Work"]);
    store.set(atom_vaultHandle, vault);
    expect(activeMounts()).toEqual([]);
  });

  it("stay open, unsaved edits and all, while their folder is locked", async () => {
    const store = createStore();
    const vault = new MemoryDirectoryHandle("vault");
    await vault.writeText("a.md", "saved");
    const work = new MemoryDirectoryHandle("Work");
    await work.writeText("plan.md", "saved");
    const library = new CompositeDirectoryHandle(vault.asHandle(), [{ name: "Work", handle: work.asHandle(), locked: true }]);
    const root = library as unknown as FileSystemDirectoryHandle;
    store.set(atom_vaultHandle, root);
    store.set(atom_openFiles, { "a.md": tab("a.md", "saved"), "Work/plan.md": tab("Work/plan.md", "edited") } as any);

    await store.set(atom_rebindHandles, root);

    expect(store.get(atom_openFiles)["Work/plan.md"]?.content).toBe("edited");
    expect(store.get(atom_openFiles)["a.md"]).toBeDefined();
  });
});
