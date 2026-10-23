import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import FolderPopover from "./FolderPopover";

const handle = {} as FileSystemFileHandle;
const file = (path: string) => ({ name: path.split("/").pop()!, path, handle, kind: "file" as const });

const vault = vi.hoisted(() => ({ files: null as null | { name: string; path: string }[] }));
const defaultFiles = [file("Inbox.md"), file("Projects/Roadmap.md"), file("Projects/Launch/Checklist.md"), file("Projects/Launch/Pricing.md")];
vi.mock("../hooks/useVaultFileSearch", () => ({
  useVaultFileSearch: () => ({
    allFiles: vault.files ?? defaultFiles,
    folderPaths: ["Projects", "Projects/Launch", "Projects/Drafts"],
  }),
}));

const openVault = vi.fn();
vi.mock("../hooks/use-vault-menu-items", () => ({
  useVaultMenuItems: () => [{ label: "Open Vault…", onClick: openVault }],
}));

const anchor = { left: 40, bottom: 30 } as DOMRect;

function renderPopover(props: Partial<ComponentProps<typeof FolderPopover>> = {}) {
  const handlers = { onOpenNote: vi.fn(), onShowInFiles: vi.fn(), onClose: vi.fn() };
  render(
    <FolderPopover folder="Projects" anchor={anchor} currentPath="Projects/Roadmap.md" rootName="Vault" {...handlers} {...props} />,
  );
  return handlers;
}

const rowNames = () => screen.getAllByRole("option").map((row) => row.textContent);

describe("FolderPopover", () => {
  it("lists the folder's subfolders, then its notes, marking the pane's note", () => {
    renderPopover();
    expect(rowNames()).toEqual(["Drafts", "Launch", "Roadmap"]);
    expect(screen.getByRole("option", { name: "Roadmap" })).toHaveAttribute("aria-current", "page");
  });

  it("steps into a subfolder and back up", () => {
    renderPopover();
    fireEvent.click(screen.getByRole("option", { name: "Launch" }));
    expect(rowNames()).toEqual(["Checklist", "Pricing"]);
    fireEvent.click(screen.getByRole("button", { name: "Up to Projects" }));
    expect(rowNames()).toEqual(["Drafts", "Launch", "Roadmap"]);
    fireEvent.click(screen.getByRole("button", { name: "Up to Vault" }));
    expect(rowNames()).toEqual(["Projects", "Inbox"]);
  });

  it("offers the vault switcher and Close Vault in a Vault submenu, at the vault's root only", () => {
    const onCloseVault = vi.fn();
    const { onClose } = renderPopover({ onCloseVault });
    expect(screen.queryByRole("button", { name: "Vault" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Up to Vault" }));
    fireEvent.click(screen.getByRole("button", { name: "Vault" }));
    const submenu = screen.getByRole("menu", { name: "Vault" });
    // A press inside the submenu doesn't count as outside the popover.
    fireEvent.mouseDown(within(submenu).getByRole("menuitem", { name: "Open Vault…" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(within(submenu).getByRole("menuitem", { name: "Open Vault…" }));
    expect(openVault).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes the vault from the Vault submenu", () => {
    const onCloseVault = vi.fn();
    renderPopover({ folder: "", onCloseVault });
    fireEvent.click(screen.getByRole("button", { name: "Vault" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close Vault" }));
    expect(onCloseVault).toHaveBeenCalledOnce();
  });

  it("opens a note in the pane and closes", () => {
    const { onOpenNote, onClose } = renderPopover();
    fireEvent.click(screen.getByRole("option", { name: "Roadmap" }));
    expect(onOpenNote).toHaveBeenCalledWith(handle, "Projects/Roadmap.md");
    expect(onClose).toHaveBeenCalled();
  });

  it("filters as you type and opens the highlighted row with Enter", () => {
    const { onOpenNote } = renderPopover({ folder: "Projects/Launch" });
    const filter = screen.getByRole("textbox", { name: "Filter this folder" });
    expect(filter).toHaveFocus();
    fireEvent.change(filter, { target: { value: "pri" } });
    expect(rowNames()).toEqual(["Pricing"]);
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(onOpenNote).toHaveBeenCalledWith(handle, "Projects/Launch/Pricing.md");
  });

  it("searches every folder below it, showing where each match is", () => {
    const { onOpenNote } = renderPopover({ folder: "" });
    fireEvent.change(screen.getByRole("textbox", { name: "Filter this folder" }), { target: { value: "pri" } });
    expect(rowNames()).toEqual(["PricingProjects/Launch"]);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Filter this folder" }), { key: "Enter" });
    expect(onOpenNote).toHaveBeenCalledWith(handle, "Projects/Launch/Pricing.md");
  });

  it("names a new note in place and creates it in the folder it's on", () => {
    const onNewNote = vi.fn();
    const { onClose } = renderPopover({ onNewNote });
    fireEvent.click(screen.getByRole("button", { name: "New Note" }));
    const field = screen.getByRole("textbox", { name: "New note name" });
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: "Launch plan" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onNewNote).toHaveBeenCalledWith("Projects", "Launch plan");
    expect(onClose).toHaveBeenCalled();
  });

  it("creates a new folder in place and steps into it", async () => {
    const onNewFolder = vi.fn().mockResolvedValue("Projects/Drafts");
    const { onClose } = renderPopover({ onNewFolder });
    fireEvent.click(screen.getByRole("button", { name: "New Folder" }));
    const field = screen.getByRole("textbox", { name: "New folder name" });
    fireEvent.change(field, { target: { value: "Drafts" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onNewFolder).toHaveBeenCalledWith("Projects", "Drafts");
    expect(await screen.findByText("Empty folder")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Filter this folder" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("backs out of naming with Escape, keeping the popover open", () => {
    const { onClose } = renderPopover({ onNewNote: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "New Note" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "New note name" }), { key: "Escape" });
    expect(screen.getByRole("textbox", { name: "Filter this folder" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers to create a note named as typed when nothing matches", () => {
    const onNewNote = vi.fn();
    const { onClose } = renderPopover({ onNewNote });
    const filter = screen.getByRole("textbox", { name: "Filter this folder" });
    fireEvent.change(filter, { target: { value: " Launch plan " } });
    expect(screen.getByRole("option", { name: /Create “Launch plan”/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(filter, { key: "Enter" });
    expect(onNewNote).toHaveBeenCalledWith("Projects", "Launch plan");
    expect(onClose).toHaveBeenCalled();
  });

  it("only says there are no matches without New Note", () => {
    renderPopover();
    fireEvent.change(screen.getByRole("textbox", { name: "Filter this folder" }), { target: { value: "zzz" } });
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("has no New Note or New Folder without their handlers", () => {
    renderPopover();
    expect(screen.queryByRole("button", { name: "New Note" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Folder" })).not.toBeInTheDocument();
  });

  it("draws only some rows of a long folder", () => {
    vault.files = Array.from({ length: 500 }, (_, i) => file(`Note ${String(i).padStart(3, "0")}.md`));
    renderPopover({ folder: "" });
    expect(screen.queryAllByRole("option").length).toBeLessThan(500);
    vault.files = null;
  });

  it("moves with the arrow keys, and goes up with Backspace when nothing is typed", () => {
    renderPopover();
    const filter = screen.getByRole("textbox", { name: "Filter this folder" });
    fireEvent.keyDown(filter, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Launch" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(filter, { key: "ArrowRight" });
    expect(rowNames()).toEqual(["Checklist", "Pricing"]);
    fireEvent.keyDown(filter, { key: "Backspace" });
    expect(rowNames()).toEqual(["Drafts", "Launch", "Roadmap"]);
  });

  it("says when a folder is empty", () => {
    renderPopover({ folder: "Projects/Drafts" });
    expect(screen.getByText("Empty folder")).toBeInTheDocument();
  });

  it("shows the folder it's on in Files, and closes", () => {
    const { onShowInFiles, onClose } = renderPopover();
    fireEvent.click(screen.getByRole("option", { name: "Launch" }));
    fireEvent.click(screen.getByRole("button", { name: "Show in Files" }));
    expect(onShowInFiles).toHaveBeenCalledWith("Projects/Launch");
    expect(onClose).toHaveBeenCalled();
  });

  it("has no Show in Files without a sidebar", () => {
    renderPopover({ onShowInFiles: undefined });
    expect(screen.queryByRole("button", { name: "Show in Files" })).not.toBeInTheDocument();
  });

  it("closes on Escape and on a click outside", () => {
    const { onClose } = renderPopover();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Filter this folder" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
