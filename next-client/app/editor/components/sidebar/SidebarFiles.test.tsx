import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import SidebarFiles from "./SidebarFiles";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/editor" }));
const fs = vi.hoisted(() => ({ newFromFolderTemplate: () => Promise.resolve(null) }));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ vaultHandle: { name: "Notes" }, newFromFolderTemplate: fs.newFromFolderTemplate }),
}));
vi.mock("@/app/hooks/use-pins", () => ({ usePins: () => ({ isPinned: () => false, togglePin: vi.fn() }) }));

// The tree, reduced to what it was given.
type TreeProps = {
  processedFiles: { path: string }[];
  folderPaths: string[];
  expandAll?: boolean;
  isSearchActive?: boolean;
  newFromFolderTemplate?: unknown;
};
const tree = vi.hoisted(() => ({ props: null as TreeProps | null }));
vi.mock("../VaultFileTree", () => ({
  default: function MockTree(props: TreeProps) {
    useEffect(() => {
      tree.props = props;
    });
    return <div data-testid="file-tree" />;
  },
}));

const files = ["projects/roadmap.md", "projects/launch/plan.md", "notes/release.md"].map((path) => ({ path, name: path.split("/").pop() }));
const folders = ["projects", "projects/launch", "notes"];

function setup(store = createStore()) {
  const focus = vi.fn();
  const treeController = { current: { focus, startCreate: vi.fn(), reveal: vi.fn(), openBackgroundMenu: vi.fn() } } as never;
  render(
    <Provider store={store}>
      <SidebarFiles treeController={treeController} activeFilePath={null} openHandle={vi.fn()} allFiles={files} folderPaths={folders} />
    </Provider>,
  );
  return { focus, box: screen.getByRole("textbox", { name: "Search files" }) };
}

const shownPaths = () => tree.props!.processedFiles.map((file) => file.path);

describe("SidebarFiles filter", () => {
  beforeEach(() => {
    cleanup();
    tree.props = null;
  });

  it("shows the whole tree, folders as remembered, while empty", () => {
    setup();
    expect(shownPaths()).toEqual(files.map((file) => file.path));
    expect(tree.props!.folderPaths).toEqual(folders);
    expect(tree.props!.expandAll).toBe(false);
  });

  it("gives the tree the folder template action only when the vault has a folder template", () => {
    setup();
    expect(tree.props!.newFromFolderTemplate).toBeUndefined();
    cleanup();
    const store = createStore();
    store.set(atom_fileMetadata, {
      "_templates/Launch/README.md": { path: "_templates/Launch/README.md", name: "README", frontmatter: { scaffold: "true" } } as never,
    });
    setup(store);
    expect(tree.props!.newFromFolderTemplate).toBe(fs.newFromFolderTemplate);
  });

  it("narrows the tree to paths matching a regular expression, with their folders open", () => {
    const { box } = setup();
    fireEvent.change(box, { target: { value: "launch/.*md$" } });
    expect(shownPaths()).toEqual(["projects/launch/plan.md"]);
    expect(tree.props!.folderPaths).toEqual(["projects", "projects/launch"]);
    expect(tree.props!.expandAll).toBe(true);
    expect(tree.props!.isSearchActive).toBe(true);
    expect(box).not.toHaveAttribute("aria-invalid");
  });

  it("matches an invalid pattern as plain text, marked invalid", () => {
    const { box } = setup();
    fireEvent.change(box, { target: { value: "release(" } });
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(shownPaths()).toEqual([]);
  });

  it("clears on Escape, which then reaches the sidebar; moves into the tree on ↓", () => {
    const { box, focus } = setup();
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    fireEvent.change(box, { target: { value: "notes" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveValue("");
    expect(outer).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(outer).toHaveBeenCalledOnce();
    document.removeEventListener("keydown", outer);

    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(focus).toHaveBeenCalledOnce();
  });
});
