import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOpenFile } from "./use-open-file";
import { useAtom } from "jotai";
import { 
  atom_vaultHandle, 
  atom_activeFileHandle, 
  atom_activeFilePath, 
  atom_content, 
  atom_fileMetadata, 
  atom_openFiles, 
  atom_lastSavedContent,
  atom_isFileLoading
} from "@/app/atoms/atoms";

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

vi.mock("../use-dialog", () => ({
  useDialog: vi.fn(() => ({
    confirm: vi.fn().mockResolvedValue(true),
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
