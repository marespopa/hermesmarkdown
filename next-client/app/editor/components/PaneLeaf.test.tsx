import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PaneLeaf from "./PaneLeaf";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import {
  atom_activePaneId,
  atom_openFiles,
  atom_activeFilePath,
  atom_saveStatus,
} from "@/app/atoms/atoms";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
import React from "react";

// Mock hooks
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({
    openFileByName: vi.fn(),
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
    expect(dot).toHaveClass("bg-sage/80");
  });

  it("renders a pulsing blue dot when file is saving", () => {
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
    expect(dot).toHaveClass("bg-sage");
    expect(dot).toHaveClass("animate-pulse");
  });

  it("shows close button (not a dot) when file is saved", () => {
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

    // Saved state reverts to showing the close button, not a status dot
    expect(screen.queryByTitle("Saved")).not.toBeInTheDocument();
    expect(screen.getAllByTitle("Close tab").length).toBeGreaterThan(0);
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
    expect(dot).toHaveClass("bg-red-500");
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

    // file1.md should not have a saving dot
    const dots = screen.queryAllByTitle("Saving…");
    expect(dots.length).toBe(1); // Only for file2.md
  });
});
