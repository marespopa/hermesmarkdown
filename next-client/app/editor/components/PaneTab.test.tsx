import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatShortcut } from "@/app/utils/platform";
import PaneTab from "./PaneTab";

describe("PaneTab", () => {
  it("renders its subtle workspace shortcut number", () => {
    render(
      <PaneTab
        fileName="notes.md"
        shortcutNumber={3}
        isActive
        saveState="idle"
        isDraggedOver={false}
        onClose={vi.fn()}
        onClick={vi.fn()}
        onContextMenu={vi.fn()}
      />,
    );

    const shortcut = screen.getByText(formatShortcut("3"));
    expect(shortcut.tagName).toBe("SUP");
    expect(shortcut).toHaveClass("text-[10px]");
    expect(shortcut.previousElementSibling).toHaveTextContent("notes.md");
  });

  it("omits the shortcut number when the tab is outside the first nine", () => {
    render(
      <PaneTab
        fileName="notes.md"
        isActive
        saveState="idle"
        isDraggedOver={false}
        onClose={vi.fn()}
        onClick={vi.fn()}
        onContextMenu={vi.fn()}
      />,
    );

    expect(screen.queryByText(formatShortcut("3"))).not.toBeInTheDocument();
  });

  it("puts the close button before the file name, even with unsaved changes", () => {
    render(
      <PaneTab
        fileName="notes.md"
        isActive={false}
        saveState="dirty"
        isDraggedOver={false}
        onClose={vi.fn()}
        onClick={vi.fn()}
        onContextMenu={vi.fn()}
      />,
    );

    const close = screen.getByRole("button", { name: "Close tab" });
    const name = screen.getByText("notes.md");
    expect(close.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTitle("Unsaved changes")).toBeInTheDocument();
  });
});
