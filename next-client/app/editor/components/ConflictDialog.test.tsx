import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ConflictDialog from "./ConflictDialog";
import "@testing-library/jest-dom";

// Mock jotai
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

import { useAtom } from "jotai";

describe("ConflictDialog Component", () => {
  const setConflict = vi.fn();
  const setContent = vi.fn();
  const setLastSavedContent = vi.fn();
  const setFileLastModified = vi.fn();

  const mockActiveFileHandle = {
    getFile: vi.fn().mockResolvedValue({
      lastModified: 123456789,
      text: vi.fn().mockResolvedValue("remote content"),
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAtom as any).mockImplementation((atom: any) => {
      // Logic to return different values based on atom usage in the component
      const atomStr = atom?.debugLabel || atom?.toString() || "";
      
      if (atomStr.includes("activeFileHandle")) return [mockActiveFileHandle];
      if (atomStr.includes("fileConflict")) return [{ remoteContent: "remote content" }, setConflict];
      if (atomStr.includes("content")) return ["local content", setContent];
      if (atomStr.includes("lastSavedContent")) return ["original content", setLastSavedContent];
      if (atomStr.includes("fileLastModified")) return [100000000, setFileLastModified];
      
      // Fallback based on call order if toString/debugLabel is unhelpful
      // 1. activeFileHandle
      // 2. conflict (fileConflict)
      // 3. content
      // 4. lastSavedContent
      // 5. fileLastModified
      return [null, vi.fn()];
    });
  });

  it("renders conflict message when there is a conflict", () => {
    // Manually control return values for this test to be sure
    let callIdx = 0;
    (useAtom as any).mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return [mockActiveFileHandle];
      if (callIdx === 2) return [{ remoteContent: "remote content" }, setConflict];
      if (callIdx === 3) return ["local content", setContent];
      if (callIdx === 4) return ["original content", setLastSavedContent];
      if (callIdx === 5) return [100000000, setFileLastModified];
      return [null, vi.fn()];
    });

    render(<ConflictDialog />);

    expect(screen.getByText(/External Modification/i)).toBeInTheDocument();
    expect(screen.getByText(/This file was modified externally/i)).toBeInTheDocument();
  });

  it("does not render when there is no conflict", () => {
    let callIdx = 0;
    (useAtom as any).mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return [mockActiveFileHandle];
      if (callIdx === 2) return [null, setConflict];
      return [null, vi.fn()];
    });

    const { container } = render(<ConflictDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls setContent and updates state when 'Reload External Changes' is clicked", async () => {
    let callIdx = 0;
    (useAtom as any).mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return [mockActiveFileHandle];
      if (callIdx === 2) return [{ remoteContent: "remote content" }, setConflict];
      if (callIdx === 3) return ["local content", setContent];
      if (callIdx === 4) return ["original content", setLastSavedContent];
      if (callIdx === 5) return [100000000, setFileLastModified];
      return [null, vi.fn()];
    });

    render(<ConflictDialog />);

    const reloadButton = screen.getByText(/Reload External Changes/i);
    fireEvent.click(reloadButton);

    await vi.waitFor(() => {
      expect(setContent).toHaveBeenCalledWith("remote content");
      expect(setLastSavedContent).toHaveBeenCalledWith("remote content");
      expect(setFileLastModified).toHaveBeenCalledWith(123456789);
      expect(setConflict).toHaveBeenCalledWith(null);
    });
  });

  it("updates timestamp and closes when 'Keep My Local Edits' is clicked", async () => {
    let callIdx = 0;
    (useAtom as any).mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return [mockActiveFileHandle];
      if (callIdx === 2) return [{ remoteContent: "remote content" }, setConflict];
      if (callIdx === 3) return ["local content", setContent];
      if (callIdx === 4) return ["original content", setLastSavedContent];
      if (callIdx === 5) return [100000000, setFileLastModified];
      return [null, vi.fn()];
    });

    render(<ConflictDialog />);

    const keepButton = screen.getByText(/Keep My Local Edits/i);
    fireEvent.click(keepButton);

    await vi.waitFor(() => {
      expect(setFileLastModified).toHaveBeenCalledWith(123456789);
      expect(setConflict).toHaveBeenCalledWith(null);
      expect(setContent).not.toHaveBeenCalled();
    });
  });
});
