import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import PaneTitle, { collapseCrumbs, crumbTargets } from "./PaneTitle";

describe("collapseCrumbs", () => {
  it("keeps one or two folders as they are", () => {
    expect(collapseCrumbs(["Work"])).toEqual(["Work"]);
    expect(collapseCrumbs(["Work", "Projects"])).toEqual(["Work", "Projects"]);
  });

  it("folds the middle of a deep path, keeping the first and last folders", () => {
    expect(collapseCrumbs(["Work", "Projects", "2026", "Q4", "Clients", "Launch"])).toEqual(["Work", "…", "Launch"]);
  });
});

describe("crumbTargets", () => {
  it("opens each shown folder at its own path", () => {
    expect(crumbTargets(["Work", "Projects"])).toEqual([
      { label: "Work", path: "Work" },
      { label: "Projects", path: "Work/Projects" },
    ]);
  });

  it("opens the folded middle at the last folder it hides", () => {
    expect(crumbTargets(["Work", "Projects", "2026", "Clients"])).toEqual([
      { label: "Work", path: "Work" },
      { label: "…", path: "Work/Projects/2026", title: "Projects / 2026" },
      { label: "Clients", path: "Work/Projects/2026/Clients" },
    ]);
  });
});

describe("PaneTitle", () => {
  const base = { title: "Roadmap", saveState: "idle" as const, onContextMenu: vi.fn() };

  it("shows a deep folder folded, with the full path in its tooltip", () => {
    render(<PaneTitle {...base} folder="Work/Projects/2026/Q4/Clients" />);
    expect(screen.getByText("Work / … / Clients")).toBeInTheDocument();
    expect(screen.getByTitle("Work / Projects / 2026 / Q4 / Clients")).toBeInTheDocument();
  });

  it("opens a breadcrumb's folder from its own button, the folded middle from its last folder", () => {
    const onOpenFolder = vi.fn();
    render(<PaneTitle {...base} folder="Work/Projects/2026/Clients" onOpenFolder={onOpenFolder} />);
    fireEvent.click(screen.getByRole("button", { name: "Folder Work" }));
    expect(onOpenFolder).toHaveBeenLastCalledWith("Work", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Folders Projects / 2026" }));
    expect(onOpenFolder).toHaveBeenLastCalledWith("Work/Projects/2026", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Folder Clients" }));
    expect(onOpenFolder).toHaveBeenLastCalledWith("Work/Projects/2026/Clients", expect.anything());
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

  it("opens the note's menu from a click on its name, without starting a rename", () => {
    const onMenu = vi.fn();
    render(<PaneTitle {...base} onRename={vi.fn()} onMenu={onMenu} />);
    fireEvent.click(screen.getByRole("button", { name: "Roadmap. Note actions" }));
    expect(onMenu).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox", { name: "Note name" })).not.toBeInTheDocument();
  });

  it("marks the name expanded while its menu is open", () => {
    render(<PaneTitle {...base} onMenu={vi.fn()} menuOpen />);
    expect(screen.getByRole("button", { name: "Roadmap. Note actions" })).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the name as plain text without a menu to open", () => {
    render(<PaneTitle {...base} title={null} />);
    expect(screen.queryByRole("button", { name: /Note actions/ })).not.toBeInTheDocument();
    expect(screen.getByText("No note open")).toBeInTheDocument();
  });

  it("renames in place when the menu's Rename asks", () => {
    const onRename = vi.fn();
    const { rerender } = render(<PaneTitle {...base} onRename={onRename} onMenu={vi.fn()} />);
    expect(screen.queryByRole("textbox", { name: "Note name" })).not.toBeInTheDocument();
    rerender(<PaneTitle {...base} onRename={onRename} onMenu={vi.fn()} renameRequest={1} />);
    const field = screen.getByRole("textbox", { name: "Note name" });
    fireEvent.change(field, { target: { value: "Launch plan" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("Launch plan");
  });
});
