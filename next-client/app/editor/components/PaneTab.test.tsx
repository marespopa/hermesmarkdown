import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatShortcut } from "@/app/utils/platform";
import PaneTab from "./PaneTab";

describe("PaneTab", () => {
  it("names its workspace shortcut in the tooltip, not on the tab", () => {
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

    expect(screen.getByTitle(`notes.md · ${formatShortcut("3")}`)).toBeInTheDocument();
    expect(screen.queryByText(formatShortcut("3"))).not.toBeInTheDocument();
  });

  it("leaves the shortcut out of the tooltip when the tab is outside the first nine", () => {
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

    expect(screen.getByTitle("notes.md")).toBeInTheDocument();
  });

  it("puts the close button after the file name, even with unsaved changes", () => {
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
    expect(close.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(screen.getByTitle("Unsaved changes")).toBeInTheDocument();
  });

  it("closes on middle-click but not on other auxiliary clicks", () => {
    const onClose = vi.fn();
    render(
      <PaneTab
        fileName="notes.md"
        isActive={false}
        saveState="idle"
        isDraggedOver={false}
        onClose={onClose}
        onClick={vi.fn()}
        onContextMenu={vi.fn()}
      />,
    );

    const tab = screen.getByTitle("notes.md");
    fireEvent(tab, new MouseEvent("auxclick", { bubbles: true, button: 2 }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent(tab, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
