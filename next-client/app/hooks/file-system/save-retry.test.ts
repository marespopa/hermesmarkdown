import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileEditor } from "./use-file-editor";
import * as jotai from "jotai";
import { contentStore } from "@/app/atoms/atoms";

vi.hoisted(() => {
  if (typeof global !== 'undefined') {
    Object.defineProperty(global, "Worker", {
      configurable: true,
      writable: true,
      value: class {
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        postMessage = vi.fn();
        terminate = vi.fn();
      },
    });
  }
});

// Mock atoms
vi.mock("@/app/atoms/atoms", () => ({
  atom_vaultHandle: { name: "atom_vaultHandle" },
  atom_activeFileHandle: { name: "atom_activeFileHandle" },
  atom_activeFilePath: { name: "atom_activeFilePath" },
  atom_content: { name: "atom_content" },
  atom_fileName: { name: "atom_fileName" },
  atom_openFiles: { name: "atom_openFiles" },
  atom_lastSavedContent: { name: "atom_lastSavedContent" },
  atom_fileLastModified: { name: "atom_fileLastModified" },
  atom_fileConflict: { name: "atom_fileConflict" },
  atom_saveStatus: { name: "atom_saveStatus" },
  atom_isCloudVault: { name: "atom_isCloudVault" },
  atom_indexerState: { name: "atom_indexerState" },
  atom_vaultSetupStatus: { name: "atom_vaultSetupStatus" },
  atom_liveHandles: vi.fn((path: string) => ({ name: `atom_liveHandles:${path}` })),
  contentStore: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/app/atoms/metadata", () => ({
  atom_fileMetadata: { name: "atom_fileMetadata" },
}));

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>();
  return {
    ...actual,
    useAtom: vi.fn(),
    useSetAtom: vi.fn(),
    useAtomValue: vi.fn(),
  };
});

vi.mock("../use-dialog", () => ({
  useDialog: vi.fn(() => ({})),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useFileEditor - saveFile retry logic", () => {
  const mockVaultHandle = {
    getDirectoryHandle: vi.fn(),
    getFileHandle: vi.fn(),
    resolve: vi.fn(),
  };

  const mockFileHandle = {
    name: "test.md",
    createWritable: vi.fn(),
    getFile: vi.fn().mockResolvedValue({ lastModified: 12345 }),
  };

  const mockWritable = {
    write: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (contentStore.get as any).mockReturnValue("test.md");
    const mockImpl = (atom: any) => {
      if (atom.name === "atom_vaultHandle") return [mockVaultHandle, vi.fn()];
      if (atom.name === "atom_activeFileHandle") return [mockFileHandle, vi.fn()];
      if (atom.name === "atom_activeFilePath") return ["test.md", vi.fn()];
      return [null, vi.fn()];
    };
    (jotai.useAtom as any).mockImplementation(mockImpl);
    (jotai.useAtomValue as any).mockImplementation((atom: any) => mockImpl(atom)[0]);
    (jotai.useSetAtom as any).mockReturnValue(vi.fn());
  });

  it("retries with a fresh handle on InvalidStateError", async () => {
    const freshHandle = {
      name: "test.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({ lastModified: 67890 }),
    };

    // First attempt fails with InvalidStateError
    mockFileHandle.createWritable.mockRejectedValueOnce({ name: "InvalidStateError" });
    
    // Refresh logic: getFileHandle should be called
    mockVaultHandle.getFileHandle.mockResolvedValueOnce(freshHandle);

    const { result } = renderHook(() => useFileEditor());
    
    const success = await result.current.saveFile("new content");

    expect(success).toBe(true);
    expect(mockFileHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(mockVaultHandle.getFileHandle).toHaveBeenCalledWith("test.md", { create: true });
    expect(freshHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(mockWritable.write).toHaveBeenCalledWith("new content");
  });

  it("uses providedPath to refresh the correct handle even if activeFilePath has changed", async () => {
    const oldPath = "folder/old.md";
    const oldHandle = {
      name: "old.md",
      createWritable: vi.fn().mockRejectedValueOnce({ name: "InvalidStateError" }),
      getFile: vi.fn(),
    };
    
    const freshOldHandle = {
      name: "old.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({ lastModified: 999 }),
    };

    // Current state is a NEW file
    (jotai.useAtom as any).mockImplementation((atom: any) => {
      if (atom.name === "atom_vaultHandle") return [mockVaultHandle, vi.fn()];
      if (atom.name === "atom_activeFileHandle") return [{ name: "new.md" }, vi.fn()];
      if (atom.name === "atom_activeFilePath") return ["new.md", vi.fn()];
      return [null, vi.fn()];
    });
    (contentStore.get as any).mockReturnValue("new.md");

    // Mock walking the path
    const mockSubDir = {
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn().mockResolvedValue(freshOldHandle),
    };
    mockVaultHandle.getDirectoryHandle.mockResolvedValueOnce(mockSubDir);

    const { result } = renderHook(() => useFileEditor());
    
    // Call saveFile for the OLD handle, providing the OLD path
    const success = await result.current.saveFile("old content", oldHandle as any, 0, true, oldPath);

    expect(success).toBe(true);
    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledWith("folder");
    expect(mockSubDir.getFileHandle).toHaveBeenCalledWith("old.md", { create: true });
    expect(freshOldHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(mockWritable.write).toHaveBeenCalledWith("old content");
  });

  it("keeps the existing tab path when saving with a provided path", async () => {
    const path = "folder/test.md";
    const setActiveFilePath = vi.fn();
    const setLastSavedContent = vi.fn();
    const setFileLastModified = vi.fn();
    const setFileConflict = vi.fn();
    let openFiles: Record<string, {
      content: string;
      lastSavedContent: string;
      fileName: string;
      activeFilePath: string;
      lastModified?: number;
      conflict?: { remoteContent: string };
    }> = {
      [path]: {
        content: "new content",
        lastSavedContent: "old content",
        fileName: "test.md",
        activeFilePath: path,
      },
    };
    const setOpenFiles = vi.fn((update: typeof openFiles | ((prev: typeof openFiles) => typeof openFiles)) => {
      openFiles = typeof update === "function" ? update(openFiles) : update;
    });
    const nestedHandle = {
      name: "test.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({ lastModified: 12345 }),
    };

    (jotai.useAtom as any).mockImplementation((atom: any) => {
      if (atom.name === "atom_vaultHandle") return [mockVaultHandle, vi.fn()];
      if (atom.name === "atom_activeFileHandle") return [nestedHandle, vi.fn()];
      if (atom.name === "atom_activeFilePath") return [path, setActiveFilePath];
      if (atom.name === "atom_openFiles") return [openFiles, setOpenFiles];
      if (atom.name === "atom_lastSavedContent") return ["old content", setLastSavedContent];
      if (atom.name === "atom_fileLastModified") return [0, setFileLastModified];
      if (atom.name === "atom_fileConflict") return [{ remoteContent: "remote" }, setFileConflict];
      return [null, vi.fn()];
    });
    (contentStore.get as any).mockReturnValue(path);

    const { result } = renderHook(() => useFileEditor());

    const success = await result.current.saveFile("new content", nestedHandle as any, 0, false, path);

    expect(success).toBe(true);
    expect(mockVaultHandle.resolve).not.toHaveBeenCalled();
    expect(setActiveFilePath).toHaveBeenCalledWith(path);
    expect(setLastSavedContent).not.toHaveBeenCalled();
    expect(setFileLastModified).not.toHaveBeenCalled();
    expect(setFileConflict).not.toHaveBeenCalled();
    expect(Object.keys(openFiles)).toEqual([path]);
    expect(openFiles[path].lastSavedContent).toBe("new content");
    expect(openFiles[path].lastModified).toBe(12345);
    expect(contentStore.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: `atom_liveHandles:${path}` }),
      nestedHandle,
    );
  });

  it("does not reactivate a file when its save completes after a tab switch", async () => {
    const path = "folder/slow.md";
    const setActiveFilePath = vi.fn();
    let resolveFile!: (file: { lastModified: number }) => void;
    const slowHandle = {
      name: "slow.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockReturnValue(new Promise((resolve) => {
        resolveFile = resolve;
      })),
    };

    (jotai.useAtom as any).mockImplementation((atom: any) => {
      if (atom.name === "atom_vaultHandle") return [mockVaultHandle, vi.fn()];
      if (atom.name === "atom_activeFileHandle") return [slowHandle, vi.fn()];
      if (atom.name === "atom_activeFilePath") return [path, setActiveFilePath];
      return [null, vi.fn()];
    });
    (contentStore.get as any).mockReturnValue(path);

    const { result } = renderHook(() => useFileEditor());
    const savePromise = result.current.saveFile("new content", slowHandle as any, 0, false, path);

    await vi.waitFor(() => expect(slowHandle.getFile).toHaveBeenCalled());
    (contentStore.get as any).mockReturnValue("other.md");
    resolveFile({ lastModified: 12345 });

    expect(await savePromise).toBe(true);
    expect(setActiveFilePath).not.toHaveBeenCalled();
  });
});
