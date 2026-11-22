import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FolderRow } from "./FolderRow";

const node = { type: "folder" as const, name: "Work", path: "Work", children: [] };

function renderRow(library: "mount" | "locked" | undefined) {
  const onToggle = vi.fn();
  const onUnlock = vi.fn();
  render(
    <FolderRow
      node={node}
      depth={0}
      isCollapsed
      onToggle={onToggle}
      draggedEntry={null}
      setDraggedEntry={vi.fn()}
      onDragStartFolder={vi.fn()}
      onDropInto={vi.fn()}
      onOpenMenu={vi.fn()}
      library={library}
      onUnlock={onUnlock}
    />,
  );
  return { onToggle, onUnlock };
}

describe("FolderRow in a library", () => {
  it("says a locked folder needs access, and asks for it on a click", () => {
    const { onToggle, onUnlock } = renderRow("locked");
    expect(screen.getByText("Allow access")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem"));
    expect(onUnlock).toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("opens an added folder like any other, and keeps it from being dragged", () => {
    const { onToggle, onUnlock } = renderRow("mount");
    expect(screen.queryByText("Allow access")).not.toBeInTheDocument();
    const row = screen.getByRole("treeitem");
    expect(row).toHaveAttribute("draggable", "false");
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith("Work");
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
