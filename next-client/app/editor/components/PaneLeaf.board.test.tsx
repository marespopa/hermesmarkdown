import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import React from "react";
import PaneLeaf from "./PaneLeaf";
import { atom_activePaneId, atom_openFiles, atom_activeFilePath, atom_workspaceLayout } from "@/app/atoms/atoms";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/editor",
}));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openOrCreateLink: vi.fn(), saveFile: vi.fn(), exportFile: vi.fn() }),
}));
vi.mock("./MarkdownEditor", () => ({ default: () => <div data-testid="markdown-editor" /> }));
vi.mock("./board/BoardViewLoader", () => ({
  default: ({ onEditAsMarkdown }: { onEditAsMarkdown: () => void }) => (
    <div data-testid="board-view">
      <button onClick={onEditAsMarkdown}>Edit as Markdown (stub)</button>
    </div>
  ),
}));

const BOARD = "---\nhermes: board\n---\n\nHello\n";

const Hydrate = ({ values, children }: { values: any; children: React.ReactNode }) => {
  useHydrateAtoms(values);
  return children;
};

function renderPane(content: string, path = "Sketch.md", extra: any[] = []) {
  const leaf = { id: "solo", type: "editor" as const, openFilePaths: [path], activeFilePath: path, isPinned: false };
  return render(
    <Provider>
      <Hydrate
        values={[
          [atom_activePaneId, "solo"],
          [atom_activeFilePath, path],
          [atom_openFiles, { [path]: { fileName: path, content, lastSavedContent: content } }],
          [atom_workspaceLayout, { rootContainer: leaf }],
          ...extra,
        ]}
      >
        <CommandPaletteProvider>
          <PaneLeaf leaf={leaf} />
        </CommandPaletteProvider>
      </Hydrate>
    </Provider>,
  );
}

describe("PaneLeaf with a board", () => {
  beforeEach(() => cleanup());

  it("renders the board view for a board, not the text editor", () => {
    renderPane(BOARD);
    expect(screen.getByTestId("board-view")).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();
  });

  it("renders the text editor for a normal note", () => {
    renderPane("# Plain note");
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("board-view")).not.toBeInTheDocument();
  });

  it("offers Edit as Markdown for a board only, and toggles to Open as Board", () => {
    renderPane(BOARD);
    fireEvent.contextMenu(screen.getByText("Sketch.md"));
    fireEvent.click(screen.getByText("Edit as Markdown"));
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("board-view")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText("Sketch.md"));
    expect(screen.getByText("Open as Board")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Open as Board"));
    expect(screen.getByTestId("board-view")).toBeInTheDocument();
  });

  it("doesn't offer Edit as Markdown for a normal note", () => {
    renderPane("# Plain note", "Plain.md");
    fireEvent.contextMenu(screen.getByText("Plain.md"));
    expect(screen.queryByText("Edit as Markdown")).not.toBeInTheDocument();
  });

  it("switches to the text editor from the board's own button", () => {
    renderPane(BOARD);
    fireEvent.click(screen.getByText("Edit as Markdown (stub)"));
    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
  });

  it("keeps a private board behind the veil", () => {
    renderPane("---\nhermes: board\nprivate: true\n---\n\nSecret\n");
    expect(screen.queryByTestId("board-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument();
  });
});
