import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileSystem } from "./use-file-system";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { atom_vaultHandle, atom_openFiles, atom_workspaceLayout, atom_fileSystemVersion, atom_vaultFiles } from "@/app/atoms/atoms";

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

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>();
  return {
    ...actual,
    useAtom: vi.fn(),
    useSetAtom: vi.fn(),
    useAtomValue: vi.fn(),
  };
});

vi.mock("./use-dialog", () => ({
  useDialog: vi.fn(() => ({
    prompt: vi.fn(),
    confirm: vi.fn(),
    alert: vi.fn(),
  })),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useFileSystem - createFile conflict resolution", () => {
  const mockVaultHandle = {
    getFileHandle: vi.fn(),
    values: async function* () {
      yield* [];
    },
    isSameEntry: vi.fn().mockResolvedValue(true),
  };

  const mockWritable = {
    write: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_vaultHandle) return [mockVaultHandle, vi.fn()];
      if (atom === atom_openFiles) return [{}, vi.fn()];
      if (atom === atom_workspaceLayout) return [{ rootContainer: { id: "p1", activeFilePath: "draft" } }, vi.fn()];
      if (atom === atom_fileSystemVersion) return [0, vi.fn()];
      return [null, vi.fn()];
    });
    (useSetAtom as any).mockReturnValue(vi.fn());
    (useAtomValue as any).mockImplementation((atom: any) => {
      if (atom === atom_vaultFiles) return [];
      return null;
    });
  });

  it("appends incremental numbers when filename exists", async () => {
    const mockFileHandle = {
      name: "test (2).md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({
        lastModified: Date.now(),
        size: 0,
        text: vi.fn().mockResolvedValue(""),
      }),
    };

    // Simulate:
    // 1. test.md exists
    // 2. test (1).md exists
    // 3. test (2).md DOES NOT exist (NotFoundError)
    // 4. Create test (2).md
    mockVaultHandle.getFileHandle
      .mockResolvedValueOnce({ name: "test.md" }) // exists
      .mockResolvedValueOnce({ name: "test (1).md" }) // exists
      .mockRejectedValueOnce({ name: "NotFoundError" }) // unique found!
      .mockResolvedValueOnce(mockFileHandle); // create

    const { result } = renderHook(() => useFileSystem());
    
    const handle = await result.current.createFile("test.md", "hello world");

    expect(mockVaultHandle.getFileHandle).toHaveBeenCalledTimes(4);
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(1, "test.md", { create: false });
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(2, "test (1).md", { create: false });
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(3, "test (2).md", { create: false });
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(4, "test (2).md", { create: true });
    
    expect(handle).toBe(mockFileHandle);
    expect(mockWritable.write).toHaveBeenCalledWith("hello world");
  });

  it("handles creating a file that doesn't conflict initially", async () => {
    const mockFileHandle = {
      name: "new.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({
        lastModified: Date.now(),
        size: 0,
        text: vi.fn().mockResolvedValue(""),
      }),
    };

    mockVaultHandle.getFileHandle
      .mockRejectedValueOnce({ name: "NotFoundError" }) // unique found immediately
      .mockResolvedValueOnce(mockFileHandle); // create

    const { result } = renderHook(() => useFileSystem());
    
    const handle = await result.current.createFile("new", "fresh content");

    expect(mockVaultHandle.getFileHandle).toHaveBeenCalledTimes(2);
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(1, "new.md", { create: false });
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(2, "new.md", { create: true });
    expect(handle).toBe(mockFileHandle);
  });
});
