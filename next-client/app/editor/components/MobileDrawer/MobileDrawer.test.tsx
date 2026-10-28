import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { Provider, createStore } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_mobileDrawerOpen, atom_mobileDrawerTab } from "@/app/atoms/mobile-drawer-atoms";
import MobileDrawer from "./MobileDrawer";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/editor",
}));
vi.mock("./FilesPane", () => ({ default: () => <div>files tree</div> }));

const note = (path: string, tags: string[]) =>
  ({ path, name: path, tags, links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [], handle: null }) as FileMetadata;

function setup(tab: "files" | "tags" = "files") {
  const store = createStore();
  store.set(atom_mobileDrawerOpen, true);
  store.set(atom_mobileDrawerTab, tab);
  store.set(atom_fileMetadata, { "a.md": note("a.md", ["work/plans"]), "b.md": note("b.md", []) });
  render(<Provider store={store}><MobileDrawer /></Provider>);
  return store;
}

describe("MobileDrawer", () => {
  beforeEach(() => push.mockClear());

  it("switches between Files and Tags", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Files" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Tags" }));
    expect(screen.getByRole("tab", { name: "Tags" })).toHaveAttribute("aria-selected", "true");
    // A hidden panel has no accessible name, so find the panels by role alone.
    const [filesPanel] = screen.getAllByRole("tabpanel", { hidden: true });
    expect(filesPanel).toHaveAttribute("hidden");
    expect(screen.getByRole("tabpanel", { name: "Tags" })).toBeVisible();
  });

  it("closes first, then goes to the picked tag", () => {
    const store = setup("tags");
    fireEvent.click(screen.getByRole("button", { name: "Expand work" }));
    fireEvent.click(screen.getByRole("button", { name: /plans/ }));
    expect(store.get(atom_mobileDrawerOpen)).toBe(false);
    expect(push).toHaveBeenCalledWith("/editor/tags?tag=work/plans");
  });

  it("opens a system filter on the Tags page", () => {
    const store = setup("tags");
    fireEvent.click(screen.getByRole("button", { name: /Untagged/ }));
    expect(store.get(atom_mobileDrawerOpen)).toBe(false);
    expect(push).toHaveBeenCalledWith("/editor/tags?filter=untagged");
  });

  it("closes from the × and goes to Settings from the footer", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(push).toHaveBeenCalledWith("/editor/settings");
    expect(store.get(atom_mobileDrawerOpen)).toBe(false);
  });
});
