import { act, render, screen, cleanup, fireEvent } from "@testing-library/react";
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
import { atom_liveHandles } from "@/app/atoms/file-atoms";
import { atom_autosaveMode } from "@/app/atoms/ui-atoms";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import React from "react";

const push = vi.fn();
const renameFile = vi.fn();
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
    renameFile,
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
    openFilePaths: ["file1.md", "file2.md"],
    activeFilePath: "file1.md",
    isPinned: false,
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a dot after the title for unsaved changes with autosave off", () => {
    const initialValues = [
      [atom_autosaveMode, "manual"],
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

    expect(screen.getByRole("button", { name: "Unsaved changes. Save" })).toBeInTheDocument();
  });

  it("hides the dot through autosave's wait, and shows it once the save is late", () => {
    vi.useFakeTimers();
    try {
      render(
        <TestProvider initialValues={[
          [atom_autosaveMode, "afterDelay"],
          [atom_activePaneId, "pane-1"],
          [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "dirty", lastSavedContent: "clean" } }],
          [atom_saveStatus, { state: "idle", retryCount: 0 }],
        ]}>
          <PaneLeaf leaf={mockLeaf} />
        </TestProvider>
      );

      expect(screen.queryByRole("button", { name: "Unsaved changes. Save" })).not.toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByRole("button", { name: "Unsaved changes. Save" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a dot while the note saves, with nothing to click", () => {
    const initialValues = [
      [atom_autosaveMode, "manual"],
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

    expect(screen.getByRole("status", { name: "Saving…" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save$/ })).not.toBeInTheDocument();
  });

  it("shows no save state when the note is saved", () => {
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

    // Saved needs no glance: nothing after the title.
    expect(screen.queryByRole("button", { name: /Save$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Saving…" })).not.toBeInTheDocument();
    expect(screen.getByText("file1")).toBeInTheDocument();
  });

  it("shows a failed save as a dot that retries", () => {
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

    expect(screen.getByRole("button", { name: "Disk full. Try saving again" })).toBeInTheDocument();
  });

  it("does not show saving indicator for other files", () => {
    const initialValues = [
      [atom_autosaveMode, "manual"],
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
    expect(screen.queryByRole("status", { name: "Saving…" })).not.toBeInTheDocument();
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

    fireEvent.contextMenu(screen.getByText("file1"));
    expect(screen.getByRole("menuitem", { name: "Close" })).toBeInTheDocument();
  });
});

describe("PaneLeaf title rename", () => {
  const leaf = { id: "solo", openFilePaths: ["notes/a.md"], activeFilePath: "notes/a.md", isPinned: false };
  const handle = { kind: "file", name: "a.md" };

  beforeEach(() => {
    cleanup();
    renameFile.mockClear();
    localStorage.removeItem("sidebarOpen");
  });

  const renderNote = () =>
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "solo"],
        [atom_openFiles, { "notes/a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" } }],
        [atom_workspaceLayout, { rootContainer: leaf }],
        [atom_vaultHandle, { name: "vault" }],
        [atom_liveHandles("notes/a.md"), handle],
      ]}>
        <PaneLeaf leaf={leaf} />
      </TestProvider>
    );

  it("shows the note's folder before its name", () => {
    renderNote();
    expect(screen.getByTitle("notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "a. Note actions" })).toBeInTheDocument();
  });

  // The name opens the note's menu; its Rename turns the name into a field.
  const startRename = () => {
    fireEvent.click(screen.getByRole("button", { name: "a. Note actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
  };

  it("renames the note in place from its title's menu", () => {
    renderNote();
    startRename();
    const field = screen.getByRole("textbox", { name: "Note name" });
    fireEvent.change(field, { target: { value: "b" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(renameFile).toHaveBeenCalledWith(handle, "b.md", "notes/a.md");
    expect(screen.queryByRole("textbox", { name: "Note name" })).not.toBeInTheDocument();
  });

  it("backs out of a rename with Escape", () => {
    renderNote();
    startRename();
    const field = screen.getByRole("textbox", { name: "Note name" });
    fireEvent.change(field, { target: { value: "b" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(renameFile).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "a. Note actions" })).toBeInTheDocument();
  });

  it("can't rename the draft", () => {
    const draft = { ...leaf, openFilePaths: ["draft"], activeFilePath: "draft" };
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "solo"],
        [atom_openFiles, { draft: { fileName: "Untitled", content: "A", lastSavedContent: "A" } }],
        [atom_workspaceLayout, { rootContainer: draft }],
        [atom_vaultHandle, { name: "vault" }],
      ]}>
        <PaneLeaf leaf={draft} />
      </TestProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Untitled. Note actions" }));
    expect(screen.queryByRole("menuitem", { name: /Rename/ })).not.toBeInTheDocument();
  });
});
