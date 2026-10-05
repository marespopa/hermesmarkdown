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
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
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
    expect(dot).toHaveClass("bg-amber-500");
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

    // Saved state reverts to showing the close button, not a status dot.
    // The close button's label is exposed via aria-label + a hover Tooltip,
    // not a title attribute.
    expect(screen.queryByTitle("Saved")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Close tab").length).toBeGreaterThan(0);
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

  it("shows the tab strip for a single note", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    expect(screen.getByLabelText("Close tab")).toBeInTheDocument();
    expect(screen.queryByRole("banner", { name: "Note" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Save/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tab options" })).not.toBeInTheDocument();
  });

  it("keeps the essentials in the toolbar and the rest in the More menu", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" } }],
        [atom_workspaceLayout, { rootContainer: { ...mockLeaf, openFilePaths: ["file1.md"] } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    expect(screen.getByRole("button", { name: /^Save/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Command palette" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sidebar" })).toBeInTheDocument();
    for (const name of ["Copy Markdown", "Split Right", "Settings", "Hide toolbar"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }

    const more = screen.getByRole("button", { name: "More" });
    expect(more).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "More" });
    for (const name of ["Copy Markdown", "Split Right", "Settings", "Documentation and Help", "Hide Toolbar"]) {
      expect(within(menu).getByRole("menuitem", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }

    // Clicking the button again closes the menu instead of reopening it.
    fireEvent.mouseDown(more);
    fireEvent.click(more);
    expect(screen.queryByRole("menu", { name: "More" })).not.toBeInTheDocument();
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

    fireEvent.contextMenu(screen.getByText("file1.md"));
    expect(screen.getByText("Copy Markdown")).toBeInTheDocument();
  });

  it("opens settings and help from the More menu", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "clean", lastSavedContent: "clean" } }],
        [atom_workspaceLayout, { rootContainer: { ...mockLeaf, openFilePaths: ["file1.md"] } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(push).toHaveBeenCalledWith("/editor/settings");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Documentation and Help" }));
    expect(push).toHaveBeenCalledWith("/documentation");
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
  it("lets a tab with unsaved changes be closed by click", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "pane-1"],
        [atom_openFiles, { "file1.md": { fileName: "file1.md", content: "dirty", lastSavedContent: "clean" } }],
      ]}>
        <PaneLeaf leaf={{ ...mockLeaf, openFilePaths: ["file1.md"] }} />
      </TestProvider>
    );

    expect(screen.getByTitle("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close tab" })).toBeInTheDocument();
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

  it("shows window-wide actions once, in the top-right pane, whichever pane has focus", () => {
    for (const activePaneId of ["left", "right"]) {
      renderSplit(activePaneId);
      const [leftPane, rightPane] = Array.from(document.querySelectorAll("[data-pane-id]")) as HTMLElement[];

      // Home lives in the sidebar, not the toolbar.
      expect(within(leftPane).queryByRole("button", { name: "Home feed" })).not.toBeInTheDocument();
      expect(within(rightPane).getByRole("button", { name: "More" })).toBeInTheDocument();
      expect(within(leftPane).queryByRole("button", { name: "More" })).not.toBeInTheDocument();
      // The sidebar toggle stays in the top-left pane.
      expect(within(leftPane).getByRole("button", { name: "Sidebar" })).toBeInTheDocument();
      expect(within(rightPane).queryByRole("button", { name: "Sidebar" })).not.toBeInTheDocument();
      cleanup();
    }
  });

  it("keeps each pane's own actions in an unfocused pane", () => {
    renderSplit("right");
    const leftPane = document.querySelector('[data-pane-id="left"]') as HTMLElement;

    expect(within(leftPane).getByRole("button", { name: /^Save/ })).toBeInTheDocument();
    expect(within(leftPane).getByRole("button", { name: "Close Pane" })).toBeInTheDocument();
  });
});

describe("PaneLeaf toolbar menu and sidebar toggle", () => {
  const leaf = { id: "solo", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };

  beforeEach(() => {
    cleanup();
    localStorage.removeItem("sidebarOpen");
  });

  const renderSolo = () =>
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "solo"],
        [atom_openFiles, { "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" } }],
        [atom_workspaceLayout, { rootContainer: leaf }],
      ]}>
        <PaneLeaf leaf={leaf} />
      </TestProvider>
    );

  it("shows icon-only buttons, and offers just Hide Toolbar on right-click", () => {
    renderSolo();
    expect(screen.getByRole("button", { name: /^Save/ })).not.toHaveTextContent("Save");

    fireEvent.contextMenu(screen.getByRole("toolbar", { name: "Pane" }));
    const menu = screen.getByRole("menu", { name: "Toolbar" });
    expect(within(menu).queryAllByRole("menuitemcheckbox")).toHaveLength(0);
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(1);
    expect(within(menu).getByRole("menuitem", { name: /Hide Toolbar/ })).toBeInTheDocument();
  });

  it("shows the sidebar from a toolbar button that only appears while it's hidden", () => {
    renderSolo();
    fireEvent.click(screen.getByRole("button", { name: "Sidebar" }));
    // Open, the sidebar's own header carries the hide button.
    expect(screen.queryByRole("button", { name: "Sidebar" })).not.toBeInTheDocument();
  });

});

describe("PaneLeaf toolbar hiding", () => {
  const leaf = { id: "solo", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };

  beforeEach(() => {
    cleanup();
    localStorage.removeItem("toolbarHidden");
  });

  it("hides the toolbar and brings it back from the handle", () => {
    render(
      <TestProvider initialValues={[
        [atom_activePaneId, "solo"],
        [atom_openFiles, { "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" } }],
        [atom_workspaceLayout, { rootContainer: leaf }],
      ]}>
        <PaneLeaf leaf={leaf} />
      </TestProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /^Hide Toolbar/ }));
    // inert takes the header's controls out of the accessibility tree.
    expect(screen.getByRole("button", { name: "Show toolbar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Close tab").closest("[inert]")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show toolbar" }));
    expect(screen.queryByRole("button", { name: "Show toolbar" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Close tab").closest("[inert]")).toBeNull();
  });
});
