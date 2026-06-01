import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFileSync } from "./use-file-sync";
import { useAtom } from "jotai";
import toast from "react-hot-toast";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_isVaultPending,
} from "@/app/atoms/atoms";

// Mock jotai and toast
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
  },
}));

describe("useFileSync Hook", () => {
  const setContent = vi.fn();
  const setLastSavedContent = vi.fn();
  const setFileLastModified = vi.fn();
  const setFileConflict = vi.fn();

  const mockFile = {
    lastModified: 200000000,
    text: vi.fn().mockResolvedValue("new external content"),
  };

  const mockActiveFileHandle = {
    getFile: vi.fn().mockResolvedValue(mockFile),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMocks = (overrides = {}) => {
    const states = new Map<any, any>([
      [atom_activeFileHandle, [mockActiveFileHandle]],
      [atom_content, ["local content", setContent]],
      [atom_lastSavedContent, ["local content", setLastSavedContent]],
      [atom_fileLastModified, [100000000, setFileLastModified]],
      [atom_fileConflict, [null, setFileConflict]],
      [atom_isVaultPending, [false]],
    ]);

    // Apply overrides
    if (overrides[atom_content as any]) states.set(atom_content, overrides[atom_content as any]);
    if (overrides[atom_lastSavedContent as any]) states.set(atom_lastSavedContent, overrides[atom_lastSavedContent as any]);

    (useAtom as any).mockImplementation((atom: any) => {
      return states.get(atom) || [null, vi.fn()];
    });
  };

  it("automatically reloads when file is modified externally and NOT dirty", async () => {
    // 1. Initial sync (no update)
    mockFile.lastModified = 100000000;
    setupMocks();

    renderHook(() => useFileSync());

    // Wait for the first sync to finish (it sets lastHandleRef)
    await waitFor(() => {
      expect(mockActiveFileHandle.getFile).toHaveBeenCalled();
    });

    // 2. External modification happens
    mockFile.lastModified = 200000000;
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => {
      expect(setContent).toHaveBeenCalledWith("new external content");
      expect(setLastSavedContent).toHaveBeenCalledWith("new external content");
      expect(setFileLastModified).toHaveBeenCalledWith(200000000);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("File updated externally"),
        expect.any(Object)
      );
    }, { timeout: 2000 });
  });

  it("triggers a conflict when file is modified externally and IS dirty", async () => {
    setupMocks({
      [atom_content as any]: ["local changes", setContent],
      [atom_lastSavedContent as any]: ["original content", setLastSavedContent],
    });

    renderHook(() => useFileSync());

    await waitFor(() => {
      expect(setFileConflict).toHaveBeenCalledWith({ remoteContent: "new external content" });
      expect(setContent).not.toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
