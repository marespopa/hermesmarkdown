import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileSystem } from "./use-file-system";
import { useDialog } from "./use-dialog";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import {
  atom_currentDirectoryHandle,
  atom_fileSystemVersion,
  atom_openFiles,
  atom_vaultFiles,
  atom_vaultHandle,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";

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
  const setVaultFiles = vi.fn();
  const mockVaultHandle = {
    name: "Vault",
    getDirectoryHandle: vi.fn(),
    getFileHandle: vi.fn(),
    values: vi.fn(async function* () {
      yield* [];
    }),
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
      if (atom === atom_currentDirectoryHandle) return [mockVaultHandle, vi.fn()];
      if (atom === atom_vaultFiles) return [[], setVaultFiles];
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

  it("retains root folders when synchronizing to a nested file", async () => {
    const nestedDirectory = {
      name: "nested",
      values: vi.fn(async function* () {
        yield* [];
      }),
    };
    mockVaultHandle.getDirectoryHandle = vi.fn().mockResolvedValue(nestedDirectory);

    const { result } = renderHook(() => useFileSystem());

    await result.current.syncSidebarToPath("nested/note.md");

    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledWith("nested");
    expect(mockVaultHandle.values).toHaveBeenCalledOnce();
    expect(nestedDirectory.values).not.toHaveBeenCalled();
    expect(setVaultFiles).toHaveBeenCalledOnce();
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

  it("prompts for a name after selecting a destination", async () => {
    const mockFileHandle = {
      name: "Meeting notes.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({
        lastModified: Date.now(),
        size: 0,
        text: vi.fn().mockResolvedValue(""),
      }),
    };
    const prompt = vi.fn().mockResolvedValue("  Meeting notes  ");
    const select = vi.fn().mockResolvedValue("__root__");
    (useDialog as any).mockReturnValue({
      prompt,
      select,
      confirm: vi.fn(),
      alert: vi.fn(),
    });
    mockVaultHandle.getFileHandle
      .mockRejectedValueOnce({ name: "NotFoundError" })
      .mockResolvedValueOnce(mockFileHandle);

    const { result } = renderHook(() => useFileSystem());

    await result.current.createNewFile();

    expect(select).toHaveBeenCalledWith(
      "Choose a folder for the new file:",
      [
        { label: "/ Vault (root)", value: "__root__" },
        { label: "+ New Folder", value: "__new_folder__" },
      ],
      "New File",
    );
    expect(prompt).toHaveBeenCalledWith("Enter file name:", "Untitled", "New File");
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(1, "Meeting notes.md", { create: false });
    expect(mockVaultHandle.getFileHandle).toHaveBeenNthCalledWith(2, "Meeting notes.md", { create: true });
    expect(mockWritable.write).toHaveBeenCalledWith("\n");
  });
});
