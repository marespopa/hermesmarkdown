import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PaneLeaf from "./PaneLeaf";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import {
  atom_activePaneId,
  atom_openFiles,
  atom_activeFilePath,
  atom_saveStatus,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { CommandPaletteProvider, useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import React from "react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/editor",
}));

// Mock hooks
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({
    openOrCreateLink: vi.fn(),
    saveFile: vi.fn(),
    exportFile: vi.fn(),
  }),
}));

// Helper to hydrate atoms for testing
const HydrateAtoms = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </HydrateAtoms>
  </Provider>
);

describe("PaneLeaf Tab Indicators", () => {
  const mockLeaf = {
    id: "pane-1",
    type: "editor" as const,
    openFilePaths: ["file1.md", "file2.md"],
    activeFilePath: "file1.md",
    isPinned: false,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a regular dirty dot when file has unsaved changes", () => {
    const initialValues = [
      [atom_activePaneId, "pane-1"],
      [atom_openFiles, { 
        "file1.md": { fileName: "file1.md", content: "dirty", lastSavedContent: "clean" },
        "file2.md": { fileName: "file2.md", content: "clean", lastSavedContent: "clean" }
      }],
      [atom_activeFilePath, "file1.md"],
      [atom_saveStatus, { state: "idle", retryCount: 0 }]
    ];

    render(
      <TestProvider initialValues={initialValues}>
        <PaneLeaf leaf={mockLeaf} />
      </TestProvider>
    );

    const dot = screen.getByTitle("Unsaved changes");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-task-hold");
  });

  it("renders a pulsing dot when file is saving", () => {
    const initialValues = [
      [atom_activePaneId, "pane-1"],
      [atom_openFiles, { 
        "file1.md": { fileName: "file1.md", content: "dirty", lastSavedContent: "clean" }
      }],
      [atom_saveStatus, { state: "saving", retryCount: 0, path: "file1.md" }]
    ];

    render(
      <TestProvider initialValues={initialValues}>
        <PaneLeaf leaf={mockLeaf} />
      </TestProvider>
    );

    const dot = screen.getByTitle("Saving…");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-fg-faint");
    expect(dot).toHaveClass("animate-pulse");
  });

  it("shows no dot when the note is saved", () => {
    const initialValues = [
      [atom_activePaneId, "pane-1"],
      [atom_openFiles, {
        "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" }
      }],
      [atom_saveStatus, { state: "saved", retryCount: 0, path: "file1.md" }]
    ];

    render(
      <TestProvider initialValues={initialValues}>
        <PaneLeaf leaf={mockLeaf} />
      </TestProvider>
    );

    // Saved needs no glance: the title shows no dot.
    expect(screen.queryByTitle("Saved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "file1. Go to a note or command" })).toBeInTheDocument();
  });

  it("renders a red dot when there is a save error", () => {
    const initialValues = [
      [atom_activePaneId, "pane-1"],
      [atom_openFiles, { 
        "file1.md": { fileName: "file1.md", content: "dirty", lastSavedContent: "clean" }
      }],
      [atom_saveStatus, { state: "error", retryCount: 0, path: "file1.md", message: "Disk full" }]
    ];

    render(
      <TestProvider initialValues={initialValues}>
        <PaneLeaf leaf={mockLeaf} />
      </TestProvider>
    );

    const dot = screen.getByTitle("Disk full");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("bg-danger");
  });

  it("does not show saving indicator for other files", () => {
    const initialValues = [
      [atom_activePaneId, "pane-1"],
      [atom_openFiles, { 
        "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" },
        "file2.md": { fileName: "file2.md", content: "clean", lastSavedContent: "clean" }
      }],
      [atom_saveStatus, { state: "saving", retryCount: 0, path: "file2.md" }]
    ];

    render(
      <TestProvider initialValues={initialValues}>
        <PaneLeaf leaf={mockLeaf} />
      </TestProvider>
    );

    // Only the note in front has a title, so another note's save shows nothing.
    expect(screen.queryAllByTitle("Saving…")).toHaveLength(0);
  });

  it("shows the note's title instead of a tab strip", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    expect(screen.getByText("file1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Close tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Save/ })).not.toBeInTheDocument();
  });

  it("offers Copy Markdown in the active tab's menu", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" } }],
        [atom_workspaceLayout, { rootContainer: { ...mockLeaf, openFilePaths: ["file1.md"] } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    fireEvent.contextMenu(screen.getByText("file1"));
    expect(screen.getByText("Copy Markdown")).toBeInTheDocument();
  });

  it("pins the note from its title's menu, and unpins it", () => {
    localStorage.clear();
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_vaultHandle, { name: "Vault" } as FileSystemDirectoryHandle],
        [atom_openFiles, {
          "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" },
          "file2.md": { fileName: "file2.md", content: "clean", lastSavedContent: "clean" },
        }],
        [atom_workspaceLayout, { rootContainer: mockLeaf }],
      ]}>
        <PaneLeaf leaf={mockLeaf} />
      </TestProvider>
    );

    fireEvent.contextMenu(screen.getByText("file1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin Note" }));
    fireEvent.contextMenu(screen.getByText("file1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Unpin Note" }));
    fireEvent.contextMenu(screen.getByText("file1"));
    expect(screen.getByRole("menuitem", { name: "Pin Note" })).toBeInTheDocument();
  });

  it("offers no pin for a tab with no vault open", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" } }],
        [atom_workspaceLayout, { rootContainer: { ...mockLeaf, openFilePaths: ["file1.md"] } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    fireEvent.contextMenu(screen.getByText("file1"));
    expect(screen.queryByRole("menuitem", { name: "Pin Note" })).not.toBeInTheDocument();
  });

  it("guides an empty pane toward creating or opening a note", () => {
    render(
      <TestProvider initialValues={[[atom_activePaneId, "empty-pane"]]}>
        <PaneLeaf
          leaf={{
            id: "empty-pane",
            type: "editor",
            openFilePaths: [],
            isPinned: false,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByRole("heading", { name: "Start writing" })).toBeInTheDocument();
    expect(screen.getByText("Create a new note, open a file from your device, or connect a vault.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New File/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open File" })).toBeInTheDocument();
    const commandButton = screen.getByRole("button", { name: /Browse all commands/ });
    expect(commandButton).toHaveTextContent(formatShortcut("K", { shift: true }));
  });
  it("closes a note with unsaved changes from its title's menu", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "dirty", lastSavedContent: "clean" } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    expect(screen.getByTitle("Unsaved changes")).toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("file1"));
    expect(screen.getByRole("menuitem", { name: "Close" })).toBeInTheDocument();
  });
});

describe("PaneLeaf in a split", () => {
  const left = { id: "left", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };
  const right = { id: "right", type: "editor" as const, openFilePaths: ["b.md"], activeFilePath: "b.md", isPinned: false };
  const split = { rootContainer: { id: "root", direction: "horizontal", sizes: [50, 50], children: [left, right] } };
  const openFiles = {
    "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
    "b.md": { fileName: "b.md", content: "B", lastSavedContent: "B" },
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderSplit = (activePaneId: string) =>
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, activePaneId],
        [atom_openFiles, openFiles],
        [atom_workspaceLayout, split],
        [atom_vaultHandle, { name: "vault" }],
      ]}>
        <PaneLeaf leaf={left} />
        <PaneLeaf leaf={right} />
      </TestProvider>
    );

  it("gives each pane its own button to the palette, and no toolbar", () => {
    renderSplit("right");
    const [leftPane, rightPane] = Array.from(document.querySelectorAll("[data-pane-id]")) as HTMLElement[];

    expect(within(leftPane).getByRole("button", { name: "a. Go to a note or command" })).toBeInTheDocument();
    expect(within(rightPane).getByRole("button", { name: "b. Go to a note or command" })).toBeInTheDocument();
    for (const name of ["More", "Close Pane", "Sidebar", "Hide toolbar"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});

describe("PaneLeaf palette button", () => {
  const leaf = { id: "solo", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };

  beforeEach(() => {
    cleanup();
    localStorage.removeItem("sidebarOpen");
  });


  it("opens the command palette from the note's title", () => {
    const PaletteState = () => <output data-testid="palette-open">{String(useCommandPalette().isOpen)}</output>;
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "solo"],
        [atom_openFiles, { "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" } }],
        [atom_workspaceLayout, { rootContainer: leaf }],
      ]}>
        <PaneLeaf leaf={leaf} />
        <PaletteState />
      </TestProvider>
    );
    expect(screen.getByTestId("palette-open")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "a. Go to a note or command" }));
    expect(screen.getByTestId("palette-open")).toHaveTextContent("true");
  });

});
