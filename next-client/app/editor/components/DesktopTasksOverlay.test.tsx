import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import DesktopTasksOverlay from "./DesktopTasksOverlay";

const mockOpenFile = vi.fn();
const mockSetPendingScrollTarget = vi.fn();

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openFile: mockOpenFile }),
}));

vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useSetAtom: () => mockSetPendingScrollTarget,
  };
});

// Stub the real task list — its own filters/atoms are exercised elsewhere;
// here we only need a hook to trigger onFileSelect and confirm this wrapper
// wires navigation + dismissal correctly.
vi.mock("./VaultSidebarTasks", () => ({
  default: ({ onFileSelect }: { onFileSelect: (h: any, p: string, l: number) => void }) => (
    <button type="button" onClick={() => onFileSelect({ name: "note.md" }, "note.md", 3)}>
      Navigate to task
    </button>
  ),
}));

describe("DesktopTasksOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders nothing when closed", () => {
    render(<DesktopTasksOverlay isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
  });

  it("renders the task list when open", () => {
    render(<DesktopTasksOverlay isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Navigate to task")).toBeInTheDocument();
  });

  it("closes via the close button", () => {
    const onClose = vi.fn();
    render(<DesktopTasksOverlay isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<DesktopTasksOverlay isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens the selected file, sets the pending scroll target, and closes on task navigation", () => {
    const onClose = vi.fn();
    render(<DesktopTasksOverlay isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Navigate to task"));

    expect(mockOpenFile).toHaveBeenCalledWith({ name: "note.md" }, "note.md");
    expect(mockSetPendingScrollTarget).toHaveBeenCalledWith({ path: "note.md", line: 3 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
