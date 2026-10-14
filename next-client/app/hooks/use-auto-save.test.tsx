import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider, createStore } from "jotai";
import React from "react";
import {
  atom_activePaneId,
  atom_liveHandles,
  atom_openFiles,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { registerBoardFlush } from "@/app/utils/board/board-flush";
import { useAutoSave } from "./use-auto-save";

const saveFile = vi.fn();
vi.mock("./use-file-system", () => ({ useFileSystem: () => ({ saveFile }) }));

const handleA = { name: "a.md" } as unknown as FileSystemFileHandle;
const handleB = { name: "b.md" } as unknown as FileSystemFileHandle;

const layout = (active: string) => ({
  rootContainer: { id: "p", type: "editor", openFilePaths: ["a.md", "b.md"], activeFilePath: active, isPinned: false },
});

function setup() {
  const store = createStore();
  store.set(atom_activePaneId, "p");
  store.set(atom_workspaceLayout, layout("a.md") as any);
  store.set(atom_openFiles, {
    "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A", activeFilePath: "a.md" },
    "b.md": { fileName: "b.md", content: "B", lastSavedContent: "B", activeFilePath: "b.md" },
  } as any);
  store.set(atom_liveHandles("a.md"), handleA);
  store.set(atom_liveHandles("b.md"), handleB);
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(() => useAutoSave(), { wrapper });
  return { store, hook };
}

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the previous tab with the store's content on a tab switch, even if it wasn't rendered yet", () => {
    const { store } = setup();
    act(() => {
      // Text written to the store (a board's flushed stroke) in the same
      // commit as the switch: the hook never rendered it.
      store.set(atom_openFiles, (prev: any) => ({ ...prev, "a.md": { ...prev["a.md"], content: "A + stroke" } }));
      store.set(atom_workspaceLayout, layout("b.md") as any);
    });
    expect(saveFile).toHaveBeenCalledWith("A + stroke", handleA, 0, true, "a.md");
  });

  it("flush() writes pending board strokes first, then saves the store's text", async () => {
    const { store, hook } = setup();
    const off = registerBoardFlush("a.md", () => {
      store.set(atom_openFiles, (prev: any) => ({ ...prev, "a.md": { ...prev["a.md"], content: "A drawn" } }));
    });
    await act(async () => {
      await hook.result.current.flush();
    });
    expect(saveFile).toHaveBeenCalledWith("A drawn", undefined, 0, true);
    off();
  });
});
