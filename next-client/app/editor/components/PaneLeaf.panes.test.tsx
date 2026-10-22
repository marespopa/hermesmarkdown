import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { Provider, createStore } from "jotai";
import React from "react";
import PaneLeaf from "./PaneLeaf";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_paneDrag } from "@/app/atoms/pane-drag-atoms";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/editor",
}));

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openOrCreateLink: vi.fn(), renameFile: vi.fn(), openFile: vi.fn() }),
}));

const mobile = vi.hoisted(() => ({ value: false }));
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => mobile.value }));

// Records the props PaneLeaf passes instead of mounting CodeMirror.
const editorProps = vi.hoisted(() => ({ last: null as null | { readOnly?: boolean } }));
vi.mock("./MarkdownEditor", () => ({
  default: function MockEditor(props: { readOnly?: boolean }) {
    React.useEffect(() => {
      editorProps.last = props;
    });
    return <div data-testid="editor" data-read-only={String(!!props.readOnly)} />;
  },
}));

const leaf = (id: string, type: PanelLeaf["type"] = "editor"): PanelLeaf => ({
  id,
  type,
  openFilePaths: ["a.md"],
  activeFilePath: "a.md",
  isPinned: false,
});

function renderPane(target: PanelLeaf, root: PanelLeaf | WorkspaceContainer = target) {
  const store = createStore();
  store.set(atom_workspaceLayout, { version: 2, rootContainer: root });
  store.set(atom_activePaneId, target.id);
  store.set(atom_openFiles, { "a.md": { fileName: "a.md", content: "# A", lastSavedContent: "# A", activeFilePath: "a.md" } });
  render(
    <Provider store={store}>
      <CommandPaletteProvider>
        <PaneLeaf leaf={target} />
      </CommandPaletteProvider>
    </Provider>,
  );
  return store;
}

const twoPanes = (a: PanelLeaf, b: PanelLeaf): WorkspaceContainer => ({
  id: "root",
  direction: "horizontal",
  sizes: [50, 50],
  children: [a, b],
});

describe("PaneLeaf panes", () => {
  beforeEach(() => {
    cleanup();
    mobile.value = false;
    editorProps.last = null;
  });

  it("shows the grip only with two or more panes, and its drag start sets the pane payload", () => {
    const a = leaf("a");
    renderPane(a);
    expect(screen.queryByRole("button", { name: "Drag to move pane" })).not.toBeInTheDocument();
    cleanup();

    const store = renderPane(a, twoPanes(a, leaf("b")));
    const grip = screen.getByRole("button", { name: "Drag to move pane" });
    fireEvent.dragStart(grip, { dataTransfer: { setData: vi.fn(), effectAllowed: "" } });
    expect(store.get(atom_paneDrag)).toEqual({ kind: "pane", paneId: "a" });
  });

  it("passes readOnly to the editor and shows the Preview badge for a preview leaf", () => {
    renderPane(leaf("p", "preview"));
    expect(screen.getByTestId("editor")).toHaveAttribute("data-read-only", "true");
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("renders a preview leaf as a normal editor under mobile chrome", () => {
    mobile.value = true;
    renderPane(leaf("p", "preview"));
    expect(screen.getByTestId("editor")).toHaveAttribute("data-read-only", "false");
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pane-drop-layer")).not.toBeInTheDocument();
  });

  it("offers an editable editor for an editor leaf", () => {
    renderPane(leaf("e"));
    expect(screen.getByTestId("editor")).toHaveAttribute("data-read-only", "false");
  });
});
