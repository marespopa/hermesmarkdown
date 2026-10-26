import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOpenFile } from "./use-open-file";
import { getDefaultStore, useAtom } from "jotai";
import { atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { 
  atom_vaultHandle, 
  atom_activeFileHandle, 
  atom_activeFilePath, 
  atom_content, 
  atom_fileMetadata, 
  atom_openFiles, 
  atom_lastSavedContent,
  atom_isFileLoading,
  contentStore,
} from "@/app/atoms/atoms";

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>();
  const useAtom = vi.fn();
  return {
    ...actual,
    useAtom,
    // A setter-only atom gets the same setter the test's useAtom mock gives it.
    useSetAtom: vi.fn((atom: unknown) => useAtom(atom)[1]),
  };
});

const { mockConfirm } = vi.hoisted(() => ({ mockConfirm: vi.fn().mockResolvedValue(true) }));
vi.mock("../use-dialog", () => ({
  useDialog: vi.fn(() => ({
    confirm: mockConfirm,
  })),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
  },
}));

describe("useOpenFile loading state", () => {
  const mockSetIsFileLoading = vi.fn();
  const mockFileHandle = {
    name: "test.md",
    getFile: vi.fn().mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        text: vi.fn().mockResolvedValue("file content"),
        lastModified: Date.now(),
      }), 50);
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_isFileLoading) return [false, mockSetIsFileLoading];
      if (atom === atom_vaultHandle) return [null, vi.fn()];
      if (atom === atom_activeFileHandle) return [null, vi.fn()];
      if (atom === atom_activeFilePath) return [null, vi.fn()];
      if (atom === atom_content) return ["", vi.fn()];
      if (atom === atom_fileMetadata) return [{}, vi.fn()];
      if (atom === atom_openFiles) return [{}, vi.fn()];
      if (atom === atom_lastSavedContent) return ["", vi.fn()];
      return [null, vi.fn()];
    });
  });

  it("should toggle isFileLoading state while opening a file", async () => {
    const { result } = renderHook(() => useOpenFile());
    
    await result.current.openFile(mockFileHandle as any);

    expect(mockSetIsFileLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsFileLoading).toHaveBeenCalledWith(false);
    
    // Check call order
    const calls = mockSetIsFileLoading.mock.calls;
    expect(calls[0][0]).toBe(true);
    expect(calls[calls.length - 1][0]).toBe(false);
  });

  it("leaves the sidebar open when a file opens", async () => {
    getDefaultStore().set(atom_sidebarOpen, true);
    const { result } = renderHook(() => useOpenFile());

    await result.current.openFile(mockFileHandle as any);

    expect(getDefaultStore().get(atom_sidebarOpen)).toBe(true);
  });

  it("should reset isFileLoading even if getFile fails", async () => {
    mockFileHandle.getFile.mockRejectedValueOnce(new Error("Failed"));
    const { result } = renderHook(() => useOpenFile());
    
    try {
      await result.current.openFile(mockFileHandle as any);
    } catch {
      // Expected
    }

    expect(mockSetIsFileLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsFileLoading).toHaveBeenLastCalledWith(false);
  });
});

describe("useOpenFile prefers saved content on disk", () => {
  const setOpenFiles = vi.fn();
  const diskHandle = {
    name: "board.md",
    getFile: vi.fn().mockResolvedValue({ text: async () => "on disk", lastModified: 1 }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_openFiles) return [{}, setOpenFiles];
      if (atom === atom_activeFilePath) return ["other.md", vi.fn()];
      if (atom === atom_content) return ["", vi.fn()];
      if (atom === atom_lastSavedContent) return ["", vi.fn()];
      if (atom === atom_fileMetadata) return [{}, vi.fn()];
      return [null, vi.fn()];
    });
  });

  function applyOpenFilesUpdate(prev: Record<string, any>) {
    const update = setOpenFiles.mock.calls[0][0];
    return update(prev)["board.md"];
  }

  it("loads disk content without prompting when the tab was blanked", async () => {
    const prev = { "board.md": { content: "", lastSavedContent: "on disk", fileName: "board.md", activeFilePath: "board.md" } };
    contentStore.set(atom_openFiles, prev);
    const { result } = renderHook(() => useOpenFile());

    await result.current.openFile(diskHandle as any, "board.md");

    expect(mockConfirm).not.toHaveBeenCalled();
    const next = applyOpenFilesUpdate(prev);
    expect(next.content).toBe("on disk");
    expect(next.snapshots).toBeUndefined();
  });

  it("keeps browser-only edits as a local snapshot instead of prompting", async () => {
    const prev = { "board.md": { content: "browser edit", lastSavedContent: "old", fileName: "board.md", activeFilePath: "board.md" } };
    contentStore.set(atom_openFiles, prev);
    const { result } = renderHook(() => useOpenFile());

    await result.current.openFile(diskHandle as any, "board.md");

    expect(mockConfirm).not.toHaveBeenCalled();
    const next = applyOpenFilesUpdate(prev);
    expect(next.content).toBe("on disk");
    expect(next.lastSavedContent).toBe("on disk");
    expect(next.snapshots).toEqual([expect.objectContaining({ type: "local", content: "browser edit" })]);
  });
});

describe("useOpenFile with the note already open", () => {
  const setOpenFiles = vi.fn();
  const text = vi.fn(async () => "on disk");
  const getFile = vi.fn();
  const handle = { name: "note.md", getFile };
  const prev = { "note.md": { content: "browser edit", lastSavedContent: "saved", fileName: "note.md", activeFilePath: "note.md", lastModified: 1 } };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_openFiles) return [{}, setOpenFiles];
      if (atom === atom_activeFilePath) return ["other.md", vi.fn()];
      if (atom === atom_content) return ["", vi.fn()];
      if (atom === atom_lastSavedContent) return ["", vi.fn()];
      if (atom === atom_fileMetadata) return [{}, vi.fn()];
      return [null, vi.fn()];
    });
    contentStore.set(atom_openFiles, prev);
  });

  it("shows it from memory and reads no text when the file is unchanged", async () => {
    getFile.mockResolvedValue({ text, lastModified: 1 });
    const { result } = renderHook(() => useOpenFile());

    await result.current.openFile(handle as any, "note.md");

    expect(text).not.toHaveBeenCalled();
    expect(setOpenFiles).not.toHaveBeenCalled();
    // Unsaved edits stay; autosave writes them as usual.
    expect(contentStore.get(atom_openFiles)["note.md"].content).toBe("browser edit");
  });

  it("takes the disk text when the file changed, keeping browser edits as a snapshot", async () => {
    getFile.mockResolvedValue({ text, lastModified: 2 });
    const { result } = renderHook(() => useOpenFile());

    await result.current.openFile(handle as any, "note.md");

    const next = contentStore.get(atom_openFiles)["note.md"];
    expect(next).toMatchObject({ content: "on disk", lastSavedContent: "on disk", lastModified: 2 });
    expect(next.snapshots).toEqual([expect.objectContaining({ type: "local", content: "browser edit" })]);
  });

  it("falls back to a full open when the file can't be checked", async () => {
    getFile.mockRejectedValueOnce(new Error("busy")).mockResolvedValue({ text, lastModified: 2 });
    const { result } = renderHook(() => useOpenFile());

    await result.current.openFile(handle as any, "note.md");

    expect(setOpenFiles).toHaveBeenCalled();
    expect(setOpenFiles.mock.calls[0][0](prev)["note.md"].content).toBe("on disk");
  });
});
