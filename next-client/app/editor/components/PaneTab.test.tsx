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
    expect(shortcut).toHaveClass("text-[7px]");
    expect(shortcut.previousElementSibling).toHaveTextContent("notes.md");
    expect(shortcut.nextElementSibling).toHaveClass("ml-1.5");
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
});
