import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_openFiles, type FileState } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useNoteBuffer } from "./use-note-buffer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const saveFile = vi.fn();
vi.mock("@/app/hooks/file-system/use-save-file", () => ({ useSaveFile: () => ({ saveFile }) }));

const PATH = "journal/2026-W41.md";

function fakeFile(text: string, lastModified = 100) {
  const disk = { text, lastModified };
  const handle = { kind: "file", name: "2026-W41.md", getFile: async () => ({ text: async () => disk.text, lastModified: disk.lastModified }) };
  return { disk, handle: handle as unknown as FileSystemFileHandle };
}

// A vault whose only file is PATH.
function fakeVault(handle: FileSystemFileHandle) {
  const journal = { kind: "directory", name: "journal", getFileHandle: async () => handle };
  return { kind: "directory", name: "vault", getDirectoryHandle: async () => journal } as unknown as FileSystemDirectoryHandle;
}

const tab = (content: string, lastSavedContent = content): FileState => ({
  content,
  lastSavedContent,
  fileName: "2026-W41",
  activeFilePath: PATH,
  lastModified: 100,
});

function setup(handle: FileSystemFileHandle, openState?: FileState) {
  const store = createStore();
  store.set(atom_vaultHandle, fakeVault(handle));
  if (openState) {
    store.set(atom_openFiles, { draft: { content: "", lastSavedContent: "", fileName: "untitled", activeFilePath: null }, [PATH]: openState });
    store.set(atom_workspaceLayout, {
      rootContainer: { id: "p", type: "editor", openFilePaths: [PATH], activeFilePath: PATH, isPinned: false },
    });
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  const { result } = renderHook(() => useNoteBuffer(), { wrapper });
  return { store, buffer: result.current };
}

describe("useNoteBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    saveFile.mockResolvedValue(true);
  });

  describe("readCurrentText", () => {
    it("returns the disk text of a closed note, resolving a fresh handle", async () => {
      const { handle } = fakeFile("on disk\n");
      const { buffer } = setup(handle);
      await expect(buffer.readCurrentText(PATH)).resolves.toBe("on disk\n");
    });

    it("returns an open, dirty tab's text over an unchanged disk file, leaving the tab alone", async () => {
      const { handle } = fakeFile("saved\n");
      const state = tab("saved\nunsaved", "saved\n");
      const { store, buffer } = setup(handle, state);
      await expect(buffer.readCurrentText(PATH)).resolves.toBe("saved\nunsaved");
      expect(store.get(atom_openFiles)[PATH]).toBe(state);
    });

    it("returns the disk text when the disk file changed under a dirty tab", async () => {
      const { handle } = fakeFile("changed elsewhere\n", 200);
      const state = tab("saved\nunsaved", "saved\n");
      const { store, buffer } = setup(handle, state);
      await expect(buffer.readCurrentText(PATH, handle)).resolves.toBe("changed elsewhere\n");
      expect(store.get(atom_openFiles)[PATH]).toBe(state);
    });
  });

  describe("writeThrough", () => {
    const append = (text: string) => `${text}+`;

    it("writes a closed note straight to disk", async () => {
      const { handle } = fakeFile("a");
      const { store, buffer } = setup(handle);
      const before = store.get(atom_openFiles);
      let outcome: unknown;
      await act(async () => { outcome = await buffer.writeThrough(PATH, handle, append); });
      expect(outcome).toEqual({ result: "written", inBuffer: false });
      expect(saveFile).toHaveBeenCalledWith("a+", handle, 0, true, PATH);
      expect(store.get(atom_openFiles)).toBe(before);
    });

    it("updates and saves the buffer of an open, clean note", async () => {
      const { handle } = fakeFile("a");
      const { store, buffer } = setup(handle, tab("a"));
      let outcome: unknown;
      await act(async () => { outcome = await buffer.writeThrough(PATH, handle, append); });
      expect(outcome).toEqual({ result: "written", inBuffer: true });
      expect(store.get(atom_openFiles)[PATH].content).toBe("a+");
      expect(saveFile).toHaveBeenCalledWith("a+", handle, 0, true, PATH);
    });

    it("keeps unsaved edits on an unchanged disk file and saves them too", async () => {
      const { handle } = fakeFile("a");
      const { store, buffer } = setup(handle, tab("a-edit", "a"));
      await act(async () => { await buffer.writeThrough(PATH, handle, append); });
      expect(store.get(atom_openFiles)[PATH].content).toBe("a-edit+");
      expect(saveFile).toHaveBeenCalledWith("a-edit+", handle, 0, true, PATH);
    });

    it("lets disk win under a dirty tab and keeps the unsaved text as a snapshot", async () => {
      const { handle } = fakeFile("disk", 200);
      const { store, buffer } = setup(handle, tab("a-edit", "a"));
      await act(async () => { await buffer.writeThrough(PATH, handle, append); });
      const state = store.get(atom_openFiles)[PATH];
      expect(state.content).toBe("disk+");
      expect(state.snapshots).toEqual([expect.objectContaining({ type: "local", content: "a-edit" })]);
      expect(saveFile).toHaveBeenCalledWith("disk+", handle, 0, true, PATH);
    });

    it("writes nothing when the transform returns null", async () => {
      const { handle } = fakeFile("a");
      const state = tab("a");
      const { store, buffer } = setup(handle, state);
      let outcome: unknown;
      await act(async () => { outcome = await buffer.writeThrough(PATH, handle, () => null); });
      expect(outcome).toEqual({ result: "unchanged", inBuffer: false });
      expect(saveFile).not.toHaveBeenCalled();
      expect(store.get(atom_openFiles)[PATH]).toBe(state);
    });

    it("reports a failed save and whether the text is in the buffer", async () => {
      saveFile.mockResolvedValue(false);
      const { handle } = fakeFile("a");
      const { buffer } = setup(handle, tab("a"));
      let outcome: unknown;
      await act(async () => { outcome = await buffer.writeThrough(PATH, handle, append); });
      expect(outcome).toEqual({ result: "failed", inBuffer: true });
    });
  });
});
