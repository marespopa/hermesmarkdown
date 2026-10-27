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

describe("treeMenuItems folder templates", () => {
  const withTemplates = (resolved: string | null = "projects/Acme launch") => {
    const newFromFolderTemplate = vi.fn(async () => resolved);
    const reveal = vi.fn();
    return { newFromFolderTemplate, reveal, actions: { ...(actions as object), reveal } as never, props: { ...props().props, newFromFolderTemplate } };
  };

  it("lists it on a folder row between New Folder and Pin", () => {
    const t = withTemplates();
    const items = treeMenuItems({ type: "row", kind: "folder", path: "projects" }, t.props, t.actions);
    expect(labels(items)).toEqual(["New File", "New Folder", "New from Folder Template…", "Pin", "Rename", "Move to Trash"]);
  });

  it("lists it on the empty space", () => {
    const t = withTemplates();
    expect(labels(treeMenuItems({ type: "background" }, t.props, t.actions))).toContain("New from Folder Template…");
  });

  it("leaves it off inside _templates/ and when the prop is missing", () => {
    const t = withTemplates();
    for (const path of ["_templates", "_templates/Launch"]) {
      expect(labels(treeMenuItems({ type: "row", kind: "folder", path }, t.props, t.actions))).not.toContain("New from Folder Template…");
    }
    const items = treeMenuItems({ type: "row", kind: "folder", path: "projects" }, props().props, actions);
    expect(labels(items)).not.toContain("New from Folder Template…");
  });

  it("starts it for the folder, then reveals the created folder", async () => {
    const t = withTemplates();
    const items = treeMenuItems({ type: "row", kind: "folder", path: "projects" }, t.props, t.actions);
    items.find((item) => item.label === "New from Folder Template…")!.onSelect();
    expect(t.newFromFolderTemplate).toHaveBeenCalledWith("projects");
    await vi.waitFor(() => expect(t.reveal).toHaveBeenCalledWith(["projects/Acme launch"]));
  });

  it("reveals nothing when it was cancelled", async () => {
    const t = withTemplates(null);
    const items = treeMenuItems({ type: "background" }, t.props, t.actions);
    items.find((item) => item.label === "New from Folder Template…")!.onSelect();
    await vi.waitFor(() => expect(t.newFromFolderTemplate).toHaveBeenCalledWith(""));
    expect(t.reveal).not.toHaveBeenCalled();
  });
});

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
