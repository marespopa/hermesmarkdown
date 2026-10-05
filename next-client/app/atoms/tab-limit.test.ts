// @vitest-environment node
import { createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { atom_activeFilePath, atom_closeTab, atom_openFiles, atom_workspaceLayout, findLeaf } from "./atoms";
import type { FileState } from "./file-atoms";
import { forgetClosedFiles, MAX_TABS_PER_PANE, tabsToEvict, touchRecent } from "./tab-limit";
import type { PanelLeaf } from "../types/workspace";

const clean = (content = "text"): FileState => ({ content, lastSavedContent: content, fileName: "n", activeFilePath: null });
const dirty = (): FileState => ({ content: "edited", lastSavedContent: "text", fileName: "n", activeFilePath: null });
const notes = (count: number) => Array.from({ length: count }, (_, i) => `n${i}.md`);

describe("tabsToEvict", () => {
  it("closes nothing below the limit", () => {
    expect(tabsToEvict(notes(3), [], "new.md", {}, 5)).toEqual([]);
  });

  it("closes the least recently viewed tab, never-viewed ones first, leftmost on ties", () => {
    const open = notes(4);
    expect(tabsToEvict(open, ["n0.md", "n2.md", "n1.md", "n3.md"], "new.md", {}, 4)).toEqual(["n0.md"]);
    expect(tabsToEvict(open, ["n0.md", "n3.md"], "new.md", {}, 4)).toEqual(["n1.md"]);
  });

  it("never closes a tab with unsaved changes or the draft", () => {
    const files = { "n0.md": dirty(), "n1.md": clean() };
    expect(tabsToEvict(["draft", "n0.md", "n1.md"], [], "new.md", files, 3)).toEqual(["n1.md"]);
  });

  it("goes over the limit rather than close unsaved work", () => {
    expect(tabsToEvict(["n0.md", "n1.md"], [], "new.md", { "n0.md": dirty(), "n1.md": dirty() }, 2)).toEqual([]);
  });
});

describe("touchRecent", () => {
  it("moves the path to the end and drops paths no longer open", () => {
    expect(touchRecent(["a", "b", "gone"], "a", ["a", "b"])).toEqual(["b", "a"]);
  });
});

describe("forgetClosedFiles", () => {
  const leaf = (paths: string[]): PanelLeaf => ({ id: "p", type: "editor", openFilePaths: paths, isPinned: false });

  it("drops a closed note's cached text unless another pane shows it or it's unsaved", () => {
    const files = { "a.md": clean(), "b.md": clean(), "c.md": dirty(), draft: clean("") };
    const next = forgetClosedFiles(files, leaf(["b.md"]), ["a.md", "b.md", "c.md", "draft"]);
    expect(Object.keys(next).sort()).toEqual(["b.md", "c.md", "draft"]);
  });
});

describe("tab limit in the workspace", () => {
  let store: ReturnType<typeof createStore>;
  const paneTabs = () => findLeaf(store.get(atom_workspaceLayout).rootContainer, "default-pane")!.openFilePaths;
  const open = (path: string) => {
    store.set(atom_openFiles, (prev) => ({ ...prev, [path]: clean() }));
    store.set(atom_activeFilePath, path);
  };

  beforeEach(() => {
    store = createStore();
  });

  it("keeps a pane at the limit by closing its least recently viewed note", () => {
    const paths = notes(MAX_TABS_PER_PANE + 1);
    for (const path of paths.slice(0, MAX_TABS_PER_PANE)) open(path);
    store.set(atom_activeFilePath, "n0.md"); // n0 viewed again; n1 is now the oldest

    open(paths[MAX_TABS_PER_PANE]);

    expect(paneTabs()).toHaveLength(MAX_TABS_PER_PANE);
    expect(paneTabs()).not.toContain("n1.md");
    expect(paneTabs()).toContain("n0.md");
    expect(store.get(atom_openFiles)["n1.md"]).toBeUndefined();
  });

  it("keeps a note with unsaved changes open past the limit", () => {
    const paths = notes(MAX_TABS_PER_PANE + 1);
    for (const path of paths.slice(0, MAX_TABS_PER_PANE)) open(path);
    store.set(atom_openFiles, (prev) => {
      const next = { ...prev };
      for (const path of paths.slice(0, MAX_TABS_PER_PANE)) next[path] = dirty();
      return next;
    });

    open(paths[MAX_TABS_PER_PANE]);

    expect(paneTabs()).toHaveLength(MAX_TABS_PER_PANE + 1);
  });

  it("forgets a closed note's cached text", () => {
    open("a.md");
    open("b.md");
    store.set(atom_closeTab, { paneId: "default-pane", filePath: "a.md" });
    expect(store.get(atom_openFiles)["a.md"]).toBeUndefined();
    expect(store.get(atom_openFiles)["b.md"]).toBeDefined();
  });
});
