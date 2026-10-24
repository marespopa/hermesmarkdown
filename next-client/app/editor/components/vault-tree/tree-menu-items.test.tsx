import { describe, expect, it, vi } from "vitest";
import { treeMenuItems } from "./tree-menu-items";
import type { VaultFileTreeProps } from "./tree-model";

const actions = {
  targetPaths: (path: string) => [path],
  kindOf: (path: string) => (path.endsWith(".md") ? "file" : "folder"),
  openPath: vi.fn(),
  startCreate: vi.fn(),
  startRename: vi.fn(),
  trashPaths: vi.fn(),
  entryByPath: new Map(),
} as never;

const props = (pinned: string[] = []) => {
  const togglePin = vi.fn();
  const base = {
    processedFiles: [],
    activeFilePath: null,
    openFile: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    createNewFile: vi.fn(),
    createFolder: vi.fn(),
    treeView: true,
    isPinned: (path: string) => pinned.includes(path),
    togglePin,
  } satisfies VaultFileTreeProps;
  return { props: base, togglePin };
};

const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe("treeMenuItems pins", () => {
  it("offers Pin on a folder after New File / New Folder and before Rename", () => {
    const { props: treeProps, togglePin } = props();
    const items = treeMenuItems({ type: "row", kind: "folder", path: "projects" }, treeProps, actions);
    expect(labels(items)).toEqual(["New File", "New Folder", "Pin", "Rename", "Move to Trash"]);
    items.find((item) => item.label === "Pin")!.onSelect();
    expect(togglePin).toHaveBeenCalledWith("projects", "folder");
  });

  it("offers Unpin on a pinned folder", () => {
    const { props: treeProps } = props(["projects"]);
    const items = treeMenuItems({ type: "row", kind: "folder", path: "projects" }, treeProps, actions);
    expect(labels(items)).toContain("Unpin");
  });

  it("pins a note as a file", () => {
    const { props: treeProps, togglePin } = props();
    const items = treeMenuItems({ type: "row", kind: "file", path: "projects/roadmap.md" }, treeProps, actions);
    items.find((item) => item.label === "Pin")!.onSelect();
    expect(togglePin).toHaveBeenCalledWith("projects/roadmap.md", "file");
  });

  it("has no pin item without the pin props", () => {
    const { props: treeProps } = props();
    const items = treeMenuItems({ type: "row", kind: "folder", path: "projects" }, { ...treeProps, isPinned: undefined, togglePin: undefined }, actions);
    expect(labels(items)).not.toContain("Pin");
  });
});
