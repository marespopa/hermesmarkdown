import React from "react";
import { cleanup, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { useReplaceFiles } from "./use-replace-files";

const handle = (name: string) => ({ kind: "file", name }) as unknown as FileSystemFileHandle;
const palette = vi.hoisted(() => ({ files: [] as unknown[] }));
vi.mock("@/app/components/CommandPalette/use-palette-files", () => ({
  usePaletteFiles: () => ({ files: palette.files }),
}));

const file = (path: string, extra: Record<string, unknown> = {}) => ({
  path, name: path.split("/").pop(), handle: handle(path), tags: [], isPrivate: false, ...extra,
});

function setup(includeCode: boolean, tabs: Record<string, { content: string; lastSavedContent: string }> = {}, open: string[] = Object.keys(tabs)) {
  const store = createStore();
  store.set(atom_openFiles, Object.fromEntries(Object.entries(tabs).map(([path, tab]) => [path, { ...tab, fileName: path, activeFilePath: path }])));
  store.set(atom_workspaceLayout, { rootContainer: { id: "p", openFilePaths: open, activeFilePath: open[0], isPinned: false } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useReplaceFiles(includeCode), { wrapper }).result.current;
}

describe("useReplaceFiles", () => {
  afterEach(cleanup);

  it("drops private notes and Trash paths, and says whether any were private", () => {
    palette.files = [
      file("a.md"),
      file("secret.md", { isPrivate: true }),
      file(".hermesmarkdown/trash/2026-01-01/old.md"),
    ];
    const { files, hasPrivate } = setup(false);
    expect(files.map((f) => f.path)).toEqual(["a.md"]);
    expect(files[0].isNote).toBe(true);
    expect(hasPrivate).toBe(true);
  });

  it("includes code files only with Include code files", () => {
    palette.files = [file("a.md"), file("src/app.ts", { isText: true })];
    expect(setup(false).files.map((f) => f.path)).toEqual(["a.md"]);
    const withCode = setup(true).files;
    expect(withCode.map((f) => f.path)).toEqual(["a.md", "src/app.ts"]);
    expect(withCode[1].isNote).toBeUndefined();
  });

  it("sends a dirty open tab's text as content, and a clean tab by handle only", () => {
    palette.files = [file("dirty.md"), file("clean.md"), file("closed.md")];
    const { files } = setup(false, {
      "dirty.md": { content: "unsaved edit", lastSavedContent: "saved" },
      "clean.md": { content: "same", lastSavedContent: "same" },
    });
    const byPath = Object.fromEntries(files.map((f) => [f.path, f]));
    expect(byPath["dirty.md"].content).toBe("unsaved edit");
    expect(byPath["clean.md"].content).toBeUndefined();
    expect(byPath["clean.md"].handle).toBeDefined();
    expect(byPath["closed.md"].content).toBeUndefined();
  });

  it("ignores cached state of a file that is no longer in a tab", () => {
    palette.files = [file("gone.md")];
    const { files } = setup(false, { "gone.md": { content: "x", lastSavedContent: "y" } }, ["draft"]);
    expect(files[0].content).toBeUndefined();
  });
});
