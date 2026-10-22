import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, createStore } from "jotai";
import React from "react";
import { usePaneDrop } from "./use-pane-drop";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout, findLeaf } from "@/app/atoms/atoms";
import { atom_paneDrag } from "@/app/atoms/pane-drag-atoms";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const openFile = vi.fn();
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ openFile }) }));
const confirm = vi.fn();
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => ({ confirm }) }));

const handle = { name: "n.md" } as unknown as FileSystemFileHandle;
const leaf = (id: string, paths: string[]): PanelLeaf => ({
  id,
  type: "editor",
  openFilePaths: paths,
  activeFilePath: paths[0],
  isPinned: false,
});
const root: WorkspaceContainer = {
  id: "root",
  direction: "horizontal",
  sizes: [50, 50],
  children: [leaf("a", ["draft"]), leaf("b", ["x.md"])],
};

function setup() {
  const store = createStore();
  store.set(atom_workspaceLayout, { version: 2, rootContainer: root });
  store.set(atom_activePaneId, "b");
  store.set(atom_openFiles, { draft: { fileName: "Untitled", content: "", lastSavedContent: "", activeFilePath: "draft" } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => usePaneDrop(), { wrapper });
  return { store, drop: result.current };
}

describe("usePaneDrop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
    openFile.mockResolvedValue(undefined);
  });

  it("opens a dropped file in a new active pane, forcing the read from disk", async () => {
    const { store, drop } = setup();
    store.set(atom_paneDrag, { kind: "file", path: "n.md", handle });
    await drop("b", "right");
    const layout = store.get(atom_workspaceLayout).rootContainer as WorkspaceContainer;
    const activeId = store.get(atom_activePaneId);
    expect(activeId).not.toBe("b");
    expect(findLeaf(layout, activeId as string)?.openFilePaths).toEqual([]);
    expect(openFile).toHaveBeenCalledWith(handle, "n.md", true);
    expect(store.get(atom_paneDrag)).toBeNull();
  });

  it("asks before replacing a dirty draft on a center drop, and stops when declined", async () => {
    const { store, drop } = setup();
    store.set(atom_openFiles, { draft: { fileName: "Untitled", content: "unsaved", lastSavedContent: "", activeFilePath: "draft" } });
    confirm.mockResolvedValue(false);
    store.set(atom_paneDrag, { kind: "file", path: "n.md", handle });
    await drop("a", "center");
    expect(confirm).toHaveBeenCalledOnce();
    expect(openFile).not.toHaveBeenCalled();
    expect(store.get(atom_activePaneId)).toBe("a");
    expect(store.get(atom_paneDrag)).toBeNull();
  });

  it("opens in the target on a center drop without asking when the draft is clean", async () => {
    const { store, drop } = setup();
    store.set(atom_paneDrag, { kind: "file", path: "n.md", handle });
    await drop("a", "center");
    expect(confirm).not.toHaveBeenCalled();
    expect(openFile).toHaveBeenCalledWith(handle, "n.md", true);
  });

  it("moves an Open Notes drag without opening a file", async () => {
    const { store, drop } = setup();
    store.set(atom_paneDrag, { kind: "open-note", path: "x.md", sourcePaneId: "b" });
    await drop("a", "center");
    expect(openFile).not.toHaveBeenCalled();
    expect(store.get(atom_paneDrag)).toBeNull();
  });
});
