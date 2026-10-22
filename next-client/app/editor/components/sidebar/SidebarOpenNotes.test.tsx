import { render, screen, fireEvent, createEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { Provider, createStore } from "jotai";
import React from "react";
import SidebarOpenNotes from "./SidebarOpenNotes";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_paneDrag } from "@/app/atoms/pane-drag-atoms";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
import type { PanelLeaf } from "@/app/types/workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/editor",
}));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ renameFile: vi.fn(), deleteFile: vi.fn(), saveFile: vi.fn(), exportFile: vi.fn() }),
}));

const pane: PanelLeaf = {
  id: "p1",
  type: "editor",
  openFilePaths: ["one.md", "two.md", "three.md"],
  activeFilePath: "one.md",
  isPinned: false,
};

function setup() {
  const store = createStore();
  store.set(atom_workspaceLayout, { version: 2, rootContainer: pane });
  store.set(atom_activePaneId, "p1");
  store.set(
    atom_openFiles,
    Object.fromEntries(pane.openFilePaths.map((p) => [p, { fileName: p, content: "x", lastSavedContent: "x", activeFilePath: p }])),
  );
  render(
    <Provider store={store}>
      <CommandPaletteProvider>
        <SidebarOpenNotes onEditor onOpen={vi.fn()} />
      </CommandPaletteProvider>
    </Provider>,
  );
  return store;
}

const dataTransfer = () => ({ setData: vi.fn(), effectAllowed: "", dropEffect: "" });

describe("SidebarOpenNotes dragging", () => {
  beforeEach(() => cleanup());

  it("sets the open-note payload on drag start and clears it on drag end", () => {
    const store = setup();
    const row = screen.getByText("two").closest("[draggable]") as HTMLElement;
    fireEvent.dragStart(row, { dataTransfer: dataTransfer() });
    expect(store.get(atom_paneDrag)).toEqual({ kind: "open-note", path: "two.md", sourcePaneId: "p1" });
    fireEvent.dragEnd(row);
    expect(store.get(atom_paneDrag)).toBeNull();
  });

  it("still reorders when a row is dropped on another row", () => {
    const store = setup();
    const rows = ["one", "two", "three"].map((n) => screen.getByText(n).closest("[draggable]") as HTMLElement);
    rows.forEach((row) => {
      row.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20, x: 0, y: 0, toJSON: () => ({}) });
    });
    fireEvent.dragStart(rows[2], { dataTransfer: dataTransfer() });
    // jsdom has no DragEvent, so fireEvent ignores clientY: define it.
    const over = createEvent.dragOver(rows[0]);
    Object.defineProperty(over, "clientY", { value: 2 });
    Object.defineProperty(over, "dataTransfer", { value: dataTransfer() });
    fireEvent(rows[0], over);
    fireEvent.drop(rows[0], { dataTransfer: dataTransfer() });
    const layout = store.get(atom_workspaceLayout).rootContainer as PanelLeaf;
    expect(layout.openFilePaths).toEqual(["three.md", "one.md", "two.md"]);
    expect(store.get(atom_paneDrag)).toBeNull();
  });
});
