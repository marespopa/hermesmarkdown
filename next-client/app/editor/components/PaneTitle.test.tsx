import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import PaneTitle, { collapseCrumbs } from "./PaneTitle";

describe("collapseCrumbs", () => {
  it("keeps one or two folders as they are", () => {
    expect(collapseCrumbs(["Work"])).toEqual(["Work"]);
    expect(collapseCrumbs(["Work", "Projects"])).toEqual(["Work", "Projects"]);
  });

  it("folds the middle of a deep path, keeping the first and last folders", () => {
    expect(collapseCrumbs(["Work", "Projects", "2026", "Q4", "Clients", "Launch"])).toEqual(["Work", "…", "Launch"]);
  });
});

describe("PaneTitle", () => {
  const base = { title: "Roadmap", saveState: "idle" as const, onContextMenu: vi.fn() };

  it("shows a deep folder folded, with the full path in its tooltip", () => {
    render(<PaneTitle {...base} folder="Work/Projects/2026/Q4/Clients" />);
    expect(screen.getByText("Work / … / Clients")).toBeInTheDocument();
    expect(screen.getByTitle("Work / Projects / 2026 / Q4 / Clients")).toBeInTheDocument();
  });

  it("shows nothing after the name while the note is saved", () => {
    render(<PaneTitle {...base} onSave={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Save$/ })).not.toBeInTheDocument();
  });

  it("saves from the dot after the name", () => {
    const onSave = vi.fn();
    render(<PaneTitle {...base} saveState="dirty" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Unsaved changes. Save" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("retries a failed save from its dot", () => {
    const onSave = vi.fn();
    render(<PaneTitle {...base} saveState="error" saveErrorMessage="Disk full" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Disk full. Try saving again" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows the dot, not a button, while saving", () => {
    render(<PaneTitle {...base} saveState="saving" onSave={vi.fn()} />);
    expect(screen.getByRole("status", { name: "Saving…" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save$/ })).not.toBeInTheDocument();
  });

  it("opens the note's menu from the ⋯ button, without starting a rename", () => {
    const onMenu = vi.fn();
    render(<PaneTitle {...base} onRename={vi.fn()} onMenu={onMenu} />);
    fireEvent.click(screen.getByRole("button", { name: "Note actions" }));
    expect(onMenu).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox", { name: "Note name" })).not.toBeInTheDocument();
  });

  it("marks the ⋯ button expanded while its menu is open", () => {
    render(<PaneTitle {...base} onMenu={vi.fn()} menuOpen />);
    expect(screen.getByRole("button", { name: "Note actions" })).toHaveAttribute("aria-expanded", "true");
  });

  it("has no ⋯ button without a menu to open", () => {
    render(<PaneTitle {...base} title={null} />);
    expect(screen.queryByRole("button", { name: "Note actions" })).not.toBeInTheDocument();
  });

  it("shows the lock button only while scroll is locked, and unlocks on click", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<PaneTitle {...base} onToggleScrollLock={onToggle} />);
    expect(screen.queryByRole("button", { name: "Unlock scroll" })).not.toBeInTheDocument();
    rerender(<PaneTitle {...base} scrollLocked onToggleScrollLock={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Unlock scroll" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows a badge after the name", () => {
    render(<PaneTitle {...base} badge="Preview" />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("shows the grip only when a drag handler is given", () => {
    const onGrip = vi.fn();
    const { rerender } = render(<PaneTitle {...base} />);
    expect(screen.queryByRole("button", { name: "Drag to move pane" })).not.toBeInTheDocument();
    rerender(<PaneTitle {...base} onGripDragStart={onGrip} />);
    fireEvent.dragStart(screen.getByRole("button", { name: "Drag to move pane" }));
    expect(onGrip).toHaveBeenCalledOnce();
  });
});
