import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileEditor } from "./use-file-editor";
import * as jotai from "jotai";

vi.hoisted(() => {
  if (typeof global !== 'undefined') {
    (global as any).Worker = class {
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      postMessage = vi.fn();
      terminate = vi.fn();
    };
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
}));

vi.mock("@/app/atoms/metadata", () => ({
  atom_fileMetadata: { name: "atom_fileMetadata" },
}));

vi.mock("jotai", () => ({
  useAtom: vi.fn(),
  useSetAtom: vi.fn(),
  useAtomValue: vi.fn(),
}));

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

    const { result } = renderHook(() => useFileEditor({ indexVaultTags: vi.fn() }));
    
    const success = await result.current.saveFile("new content");

    expect(success).toBe(true);
    expect(mockFileHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(mockVaultHandle.getFileHandle).toHaveBeenCalledWith("test.md");
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

    // Mock walking the path
    const mockSubDir = {
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn().mockResolvedValue(freshOldHandle),
    };
    mockVaultHandle.getDirectoryHandle.mockResolvedValueOnce(mockSubDir);

    const { result } = renderHook(() => useFileEditor({ indexVaultTags: vi.fn() }));
    
    // Call saveFile for the OLD handle, providing the OLD path
    const success = await result.current.saveFile("old content", oldHandle as any, 0, true, oldPath);

    expect(success).toBe(true);
    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledWith("folder");
    expect(mockSubDir.getFileHandle).toHaveBeenCalledWith("old.md");
    expect(freshOldHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(mockWritable.write).toHaveBeenCalledWith("old content");
  });
});
