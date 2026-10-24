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

  it("leads with the vault's root, alone at the root", () => {
    expect(crumbTargets([], "Notes")).toEqual([{ label: "Notes", path: "" }]);
    expect(crumbTargets(["Work", "Projects"], "Notes")).toEqual([
      { label: "Notes", path: "" },
      { label: "Work", path: "Work" },
      { label: "Projects", path: "Work/Projects" },
    ]);
  });

  it("folds every folder but the last after the vault's root", () => {
    expect(crumbTargets(["Work", "Projects", "Clients"], "Notes")).toEqual([
      { label: "Notes", path: "" },
      { label: "…", path: "Work/Projects", title: "Work / Projects" },
      { label: "Clients", path: "Work/Projects/Clients" },
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

  it("opens the vault's root from its first crumb, a root note included", () => {
    const onOpenFolder = vi.fn();
    render(<PaneTitle {...base} onOpenFolder={onOpenFolder} rootName="Notes" />);
    fireEvent.click(screen.getByRole("button", { name: "Folder Notes" }));
    expect(onOpenFolder).toHaveBeenLastCalledWith("", expect.anything());
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
  });

  it("shows the vault's root alone when no note is open", () => {
    render(<PaneTitle {...base} title={null} onOpenFolder={vi.fn()} rootName="Notes" />);
    expect(screen.getByRole("button", { name: "Folder Notes" })).toBeInTheDocument();
    expect(screen.queryByText("No file open")).not.toBeInTheDocument();
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("leads with a \"No vault\" crumb that opens the vault menu, alone when no note is open", () => {
    const onVaultMenu = vi.fn();
    const { rerender } = render(<PaneTitle {...base} onVaultMenu={onVaultMenu} />);
    fireEvent.click(screen.getByRole("button", { name: "No vault. Open a vault" }));
    expect(onVaultMenu).toHaveBeenCalledOnce();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    rerender(<PaneTitle {...base} title={null} onVaultMenu={onVaultMenu} vaultMenuOpen />);
    expect(screen.getByRole("button", { name: "No vault. Open a vault" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("No file open")).not.toBeInTheDocument();
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("marks the crumb whose folder is open, as the name marks its open menu", () => {
    render(<PaneTitle {...base} folder="Work/Projects" onOpenFolder={vi.fn()} openFolder="Work/Projects" />);
    expect(screen.getByRole("button", { name: "Folder Projects" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Folder Work" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a second press on the open crumb from reaching the popover's click-outside", () => {
    const outside = vi.fn();
    document.addEventListener("mousedown", outside);
    render(<PaneTitle {...base} folder="Work/Projects" onOpenFolder={vi.fn()} openFolder="Work" />);
    fireEvent.mouseDown(screen.getByRole("button", { name: "Folder Work" }));
    expect(outside).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Folder Projects" }));
    expect(outside).toHaveBeenCalledOnce();
    document.removeEventListener("mousedown", outside);
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
    fireEvent.click(screen.getByRole("button", { name: "Roadmap. File actions" }));
    expect(onMenu).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox", { name: "File name" })).not.toBeInTheDocument();
  });

  it("marks the name expanded while its menu is open", () => {
    render(<PaneTitle {...base} onMenu={vi.fn()} menuOpen />);
    expect(screen.getByRole("button", { name: "Roadmap. File actions" })).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the name as plain text without a menu to open", () => {
    render(<PaneTitle {...base} title={null} />);
    expect(screen.queryByRole("button", { name: /File actions/ })).not.toBeInTheDocument();
    expect(screen.getByText("No file open")).toBeInTheDocument();
  });

  it("renames in place when the menu's Rename asks", () => {
    const onRename = vi.fn();
    const { rerender } = render(<PaneTitle {...base} onRename={onRename} onMenu={vi.fn()} />);
    expect(screen.queryByRole("textbox", { name: "File name" })).not.toBeInTheDocument();
    rerender(<PaneTitle {...base} onRename={onRename} onMenu={vi.fn()} renameRequest={1} />);
    const field = screen.getByRole("textbox", { name: "File name" });
    fireEvent.change(field, { target: { value: "Launch plan" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("Launch plan");
  });
});
