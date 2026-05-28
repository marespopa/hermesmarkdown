import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFileSync } from "./use-file-sync";
import { useAtom } from "jotai";
import toast from "react-hot-toast";

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

  it("automatically reloads when file is modified externally and NOT dirty", async () => {
    let callIdx = 0;
    (useAtom as any).mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return [mockActiveFileHandle]; // activeFileHandle
      if (callIdx === 2) return ["local content", setContent]; // content
      if (callIdx === 3) return ["local content", setLastSavedContent]; // lastSavedContent
      if (callIdx === 4) return [100000000, setFileLastModified]; // fileLastModified
      if (callIdx === 5) return [null, setFileConflict]; // fileConflict
      if (callIdx === 6) return [false]; // isVaultPending
      return [null, vi.fn()];
    });

    renderHook(() => useFileSync());

    await waitFor(() => {
      expect(setContent).toHaveBeenCalledWith("new external content");
      expect(setLastSavedContent).toHaveBeenCalledWith("new external content");
      expect(setFileLastModified).toHaveBeenCalledWith(200000000);
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("File updated externally"), expect.any(Object));
    }, { timeout: 2000 });
  });

  it("triggers a conflict when file is modified externally and IS dirty", async () => {
    let callIdx = 0;
    (useAtom as any).mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return [mockActiveFileHandle];
      if (callIdx === 2) return ["local changes", setContent];
      if (callIdx === 3) return ["original content", setLastSavedContent];
      if (callIdx === 4) return [100000000, setFileLastModified];
      if (callIdx === 5) return [null, setFileConflict];
      if (callIdx === 6) return [false];
      return [null, vi.fn()];
    });

    renderHook(() => useFileSync());

    await waitFor(() => {
      expect(setFileConflict).toHaveBeenCalledWith({ remoteContent: "new external content" });
      expect(setContent).not.toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});
