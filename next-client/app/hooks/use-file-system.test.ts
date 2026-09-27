import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFileSystem } from "./use-file-system";
import { useDialog } from "./use-dialog";
import toast from "react-hot-toast";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import {
  atom_currentDirectoryHandle,
  atom_fileMetadata,
  atom_fileSystemVersion,
  atom_isVaultPending,
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
    select: vi.fn(),
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
  const setIsVaultPending = vi.fn();
  let fileMetadata: Record<string, any>;
  const setFileMetadata = vi.fn((update: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
    fileMetadata = typeof update === "function" ? update(fileMetadata) : update;
  });
  const mockVaultHandle: any = {
    name: "Vault",
    getDirectoryHandle: vi.fn(),
    getFileHandle: vi.fn(),
    values: vi.fn(async function* (): AsyncGenerator<any> {
      yield* [];
    }),
    isSameEntry: vi.fn().mockResolvedValue(true),
    resolve: vi.fn(),
  };

  const mockWritable = {
    write: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockVaultHandle.getDirectoryHandle.mockReset();
    mockVaultHandle.getFileHandle.mockReset();
    mockVaultHandle.values.mockReset();
    mockVaultHandle.values.mockImplementation(async function* () {
      yield* [];
    });
    mockVaultHandle.isSameEntry.mockReset();
    mockVaultHandle.isSameEntry.mockResolvedValue(true);
    mockVaultHandle.resolve.mockReset();
    fileMetadata = {};
    (useAtom as any).mockImplementation((atom: any) => {
      if (atom === atom_vaultHandle) return [mockVaultHandle, vi.fn()];
      if (atom === atom_currentDirectoryHandle) return [mockVaultHandle, vi.fn()];
      if (atom === atom_vaultFiles) return [[], setVaultFiles];
      if (atom === atom_openFiles) return [{}, vi.fn()];
      if (atom === atom_workspaceLayout) return [{ rootContainer: { id: "p1", activeFilePath: "draft" } }, vi.fn()];
      if (atom === atom_fileSystemVersion) return [0, vi.fn()];
      if (atom === atom_isVaultPending) return [false, setIsVaultPending];
      if (atom === atom_fileMetadata) return [fileMetadata, setFileMetadata];
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

    const synced = await result.current.syncCurrentDirectoryToPath("nested/note.md");

    expect(synced).toBe(true);
    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledWith("nested");
    expect(mockVaultHandle.values).toHaveBeenCalledOnce();
    expect(nestedDirectory.values).not.toHaveBeenCalled();
    expect(setVaultFiles).toHaveBeenCalledOnce();
  });

  it("accepts a path prefixed with the vault folder name", async () => {
    const nestedDirectory = {
      name: "nested",
      values: vi.fn(async function* () {
        yield* [];
      }),
    };
    mockVaultHandle.getDirectoryHandle = vi.fn().mockResolvedValue(nestedDirectory);

    const { result } = renderHook(() => useFileSystem());

    const synced = await result.current.syncCurrentDirectoryToPath("Vault/nested/note.md");

    expect(synced).toBe(true);
    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledTimes(1);
    expect(mockVaultHandle.getDirectoryHandle).toHaveBeenCalledWith("nested");
  });

  it("defers current-directory sync when vault permission is unavailable", async () => {
    const permissionError = Object.assign(new Error("Permission denied"), {
      name: "NotAllowedError",
    });
    mockVaultHandle.getDirectoryHandle = vi.fn().mockRejectedValue(permissionError);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { result } = renderHook(() => useFileSystem());

    const synced = await result.current.syncCurrentDirectoryToPath("nested/note.md");

    expect(synced).toBe(false);
    expect(setIsVaultPending).toHaveBeenCalledWith(true);
    expect(warnSpy).not.toHaveBeenCalledWith(
      "Failed to find parent directory for path:",
      "nested/note.md",
      permissionError,
    );
    warnSpy.mockRestore();
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

  it("creates a folder in a recursively selected vault destination", async () => {
    const createdFolder = { kind: "directory", name: "Plans" };
    const yearDirectory = {
      kind: "directory",
      name: "2026",
      values: vi.fn(async function* () {
        yield* [];
      }),
      getDirectoryHandle: vi.fn().mockResolvedValue(createdFolder),
    };
    const archiveDirectory = {
      kind: "directory",
      name: "Archive",
      values: vi.fn(async function* () {
        yield yearDirectory;
      }),
    };
    const hiddenDirectory = {
      kind: "directory",
      name: ".private",
      values: vi.fn(async function* () {
        yield* [];
      }),
    };
    mockVaultHandle.values.mockImplementation(async function* () {
      yield archiveDirectory;
      yield hiddenDirectory;
    });
    const select = vi.fn().mockResolvedValue("path:Archive/2026");
    const prompt = vi.fn().mockResolvedValue("  Plans  ");
    (useDialog as any).mockReturnValue({
      prompt,
      select,
      confirm: vi.fn(),
      alert: vi.fn(),
    });

    const { result } = renderHook(() => useFileSystem());

    const folder = await result.current.createFolder();

    expect(select).toHaveBeenCalledWith(
      "Choose a destination for the new folder:",
      [
        { label: "/ Vault (root)", value: "__root__" },
        { label: "Archive", value: "path:Archive" },
        { label: "Archive/2026", value: "path:Archive/2026" },
      ],
      "New Folder",
    );
    expect(prompt).toHaveBeenCalledWith("Enter folder name:", "", "New Folder");
    expect(yearDirectory.getDirectoryHandle).toHaveBeenCalledWith("Plans", { create: true });
    expect(folder).toBe(createdFolder);
    expect(toast.success).toHaveBeenCalledWith("Created: Plans");
  });

  it("uses the shared rename prompt and rejects path separators", async () => {
    const prompt = vi.fn().mockResolvedValue(" invalid/name ");
    (useDialog as any).mockReturnValue({
      prompt,
      select: vi.fn(),
      confirm: vi.fn(),
      alert: vi.fn(),
    });
    const handle = { kind: "file", name: "note.md" } as FileSystemFileHandle;
    const { result } = renderHook(() => useFileSystem());

    await result.current.renameFile(handle);

    expect(prompt).toHaveBeenCalledWith("Enter new name:", "note.md", "Rename Item");
    expect(mockVaultHandle.getFileHandle).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("File names cannot contain slashes.");
  });

  it("uses the shared type-aware delete confirmation", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    (useDialog as any).mockReturnValue({
      prompt: vi.fn(),
      select: vi.fn(),
      confirm,
      alert: vi.fn(),
    });
    const handle = {
      kind: "directory",
      name: "Archive",
      remove: vi.fn(),
    };
    const { result } = renderHook(() => useFileSystem());

    await result.current.deleteFile(handle as unknown as FileSystemDirectoryHandle, "Archive");

    expect(confirm).toHaveBeenCalledWith(
      'Delete folder "Archive"? This cannot be undone.',
      "Delete folder",
      "Delete",
      "Cancel",
    );
    expect(handle.remove).not.toHaveBeenCalled();
  });

  it("refreshes the visible directory and full vault after creating in another folder", async () => {
    const newFileHandle = {
      kind: "file",
      name: "nested.md",
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue({
        lastModified: Date.now(),
        text: vi.fn().mockResolvedValue("content"),
      }),
    };
    const targetDirectory = {
      kind: "directory",
      name: "nested",
      getFileHandle: vi.fn()
        .mockRejectedValueOnce({ name: "NotFoundError" })
        .mockResolvedValueOnce(newFileHandle),
      values: vi.fn(async function* () {
        yield* [];
      }),
    };

    mockVaultHandle.resolve = vi.fn().mockResolvedValue(["nested"]);

    const { result } = renderHook(() => useFileSystem());

    await result.current.createFile("nested", "content", targetDirectory as any);

    expect(mockVaultHandle.values).toHaveBeenCalledTimes(2);
    expect(targetDirectory.values).not.toHaveBeenCalled();
  });

  it("replaces stale metadata handles and clears removed files during a full sync", async () => {
    const staleHandle = { name: "note.md" };
    const freshHandle = {
      kind: "file",
      name: "note.md",
      getFile: vi.fn().mockResolvedValue({
        lastModified: 2,
        text: vi.fn().mockResolvedValue("fresh"),
      }),
    };
    fileMetadata = {
      "note.md": {
        path: "note.md",
        name: "note.md",
        handle: staleHandle,
        tags: ["kept"],
      },
      "removed.md": {
        path: "removed.md",
        name: "removed.md",
        handle: { name: "removed.md" },
      },
    };
    mockVaultHandle.values.mockImplementationOnce(async function* () {
      yield freshHandle;
    });

    const { result } = renderHook(() => useFileSystem());

    await result.current.indexVaultTags();

    expect(fileMetadata["note.md"].handle).toBe(freshHandle);
    expect(fileMetadata["note.md"].tags).toEqual(["kept"]);
    expect(fileMetadata).not.toHaveProperty("removed.md");

    mockVaultHandle.values.mockImplementationOnce(async function* () {
      yield* [];
    });
    await result.current.indexVaultTags();

    expect(fileMetadata).toEqual({});
  });
});
