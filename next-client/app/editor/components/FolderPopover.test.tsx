import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import FolderPopover from "./FolderPopover";

const handle = {} as FileSystemFileHandle;
const file = (path: string) => ({ name: path.split("/").pop()!, path, handle, kind: "file" as const });

vi.mock("../hooks/useVaultFileSearch", () => ({
  useVaultFileSearch: () => ({
    allFiles: [file("Inbox.md"), file("Projects/Roadmap.md"), file("Projects/Launch/Checklist.md"), file("Projects/Launch/Pricing.md")],
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

  it("offers the vault switcher and Close Vault at the vault's root only", () => {
    const onCloseVault = vi.fn();
    const { onClose } = renderPopover({ onCloseVault });
    expect(screen.queryByRole("button", { name: "Open Vault…" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Up to Vault" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Vault…" }));
    expect(openVault).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close Vault" }));
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
