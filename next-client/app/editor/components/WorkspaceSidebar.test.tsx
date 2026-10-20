import React from "react";
import { act, render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore, Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_activePaneId, atom_liveHandles, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_activeEditorView, atom_closeSidebarWhileWriting, atom_filesFocusRequested, atom_newNoteRequested, atom_notePins, atom_pendingScrollTarget, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import WorkspaceSidebar from "./WorkspaceSidebar";

const fileSystem = vi.hoisted(() => ({
  vaultHandle: null as unknown,
  createNewFile: vi.fn(),
  createFolder: vi.fn(),
  openFile: vi.fn(async () => {}),
  renameFile: vi.fn(),
  treeController: null as null | { startCreate: () => void; focus: () => void },
}));

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/editor" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
}));

vi.mock("../hooks/use-recent-vaults", () => ({
  useRecentVaults: () => ({ recentVaults: [], openRecentVault: vi.fn() }),
}));

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({
    vaultHandle: fileSystem.vaultHandle,
    openFile: fileSystem.openFile,
    renameFile: fileSystem.renameFile,
    deleteFile: vi.fn(),
    duplicateFile: vi.fn(),
    moveItem: vi.fn(),
    createNewFile: fileSystem.createNewFile,
    createFolder: fileSystem.createFolder,
  }),
}));

vi.mock("../hooks/useVaultFileSearch", () => ({
  useVaultFileSearch: () => ({
    allFiles: [], folderPaths: [], processedFiles: [], totalResultsCount: 0, hasMoreResults: false,
    searchQuery: "", setSearchQuery: vi.fn(), setShowAllResults: vi.fn(), tags: ["release"], tagCounts: { release: 2 },
  }),
}));

vi.mock("./VaultFileTree", () => ({
  default: ({ controllerRef }: { controllerRef?: { current: unknown } }) => {
    if (controllerRef && fileSystem.treeController) controllerRef.current = fileSystem.treeController;
    return <div data-testid="file-tree" />;
  },
}));

const HydrateAtoms = ({ initialValues, children }: { initialValues: any; children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const ActivePane = () => <output data-testid="active-pane">{useAtomValue(atom_activePaneId)}</output>;
const FocusRequest = () => <output data-testid="focus-request">{String(useAtomValue(atom_filesFocusRequested))}</output>;
const NewNoteRequest = () => <output data-testid="new-note">{String(useAtomValue(atom_newNoteRequested))}</output>;
const ScrollTarget = () => <output data-testid="scroll-target">{JSON.stringify(useAtomValue(atom_pendingScrollTarget))}</output>;

const left = { id: "left", type: "editor" as const, openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };
const right = { id: "right", type: "editor" as const, openFilePaths: ["b.md"], activeFilePath: "b.md", isPinned: false };

const renderSidebar = (open = true, descriptor: unknown = null, focusRequested = false, openFiles: Record<string, unknown> = {}) =>
  render(
    <Provider>
      <HydrateAtoms initialValues={[
        [atom_sidebarOpen, open],
        [atom_activePaneId, "left"],
        [atom_filesFocusRequested, focusRequested],
        [atom_vaultHandle, fileSystem.vaultHandle],
        [atom_vaultDescriptor, descriptor],
        [atom_openFiles, {
          "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
          "b.md": { fileName: "b.md", content: "B changed", lastSavedContent: "B" },
          ...openFiles,
        }],
        [atom_workspaceLayout, { rootContainer: { id: "root", direction: "horizontal", sizes: [50, 50], children: [left, right] } }],
      ]}>
        <WorkspaceSidebar />
        <ActivePane />
        <FocusRequest />
        <NewNoteRequest />
        <ScrollTarget />
      </HydrateAtoms>
    </Provider>
  );

describe("WorkspaceSidebar", () => {
  beforeEach(() => {
    cleanup();
    fileSystem.vaultHandle = null;
    fileSystem.treeController = null;
    navigation.push.mockClear();
    navigation.pathname = "/editor";
    localStorage.removeItem("sidebarOpen");
    localStorage.removeItem("sidebarCollapsed");
    localStorage.removeItem("sidebarWidth");
  });

  it("focuses the Files tree when Show Files asks for it, then clears the request", () => {
    const focus = vi.fn();
    fileSystem.vaultHandle = { name: "vault" };
    fileSystem.treeController = { startCreate: vi.fn(), focus };
    renderSidebar(true, null, true);

    expect(focus).toHaveBeenCalledOnce();
    expect(screen.getByTestId("focus-request")).toHaveTextContent("false");
  });

  it("leaves the tree alone without a focus request", () => {
    const focus = vi.fn();
    fileSystem.vaultHandle = { name: "vault" };
    fileSystem.treeController = { startCreate: vi.fn(), focus };
    renderSidebar(true);

    expect(focus).not.toHaveBeenCalled();
  });

  it("shows the file tree only with a vault", () => {
    renderSidebar();
    expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
    cleanup();

    fileSystem.vaultHandle = { name: "vault" };
    renderSidebar();
    expect(screen.getByTestId("file-tree")).toBeInTheDocument();
  });

  it("creates a file or folder at the vault's root from the Files ⋯ menu", () => {
    const vault = { name: "Notes" };
    fileSystem.vaultHandle = vault;
    renderSidebar(true);
    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Note" }));
    expect(fileSystem.createNewFile).toHaveBeenCalledWith(vault);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "New Folder" }));
    expect(fileSystem.createFolder).toHaveBeenCalledWith(vault);
  });

  it("offers the shared create actions in the Files ⋯ menu, without a note from a template", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true);
    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["New Note", "New Folder"]);
  });

  it("closes the Files menu on Escape", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true);
    fireEvent.click(screen.getByRole("button", { name: "Files options" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has no Files menu without a vault, and none on Open Notes", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: /options$/ })).not.toBeInTheDocument();
  });

  it("collapses a section from its header", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true);
    const header = screen.getByRole("button", { name: "Files" });

    fireEvent.click(header);

    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("file-tree")).not.toBeInTheDocument();
  });

  it("lists the focused pane's open notes, the one in front highlighted", () => {
    renderSidebar(true);
    const openNotes = within(screen.getByRole("region", { name: "Open Notes" }));
    expect(openNotes.getByRole("button", { name: "a" })).toHaveAttribute("aria-current", "page");
    // b.md is in the other pane.
    expect(openNotes.queryByRole("button", { name: /^b/ })).not.toBeInTheDocument();
    expect(openNotes.getByRole("button", { name: "Close a" })).toBeInTheDocument();
  });

  it("shows each open note's Ctrl/Cmd+1–9 shortcut on the editor only", () => {
    renderSidebar(true);
    const openNotes = within(screen.getByRole("region", { name: "Open Notes" }));
    expect(openNotes.getByRole("button", { name: "a" })).toHaveAttribute("aria-keyshortcuts", "Control+1 Meta+1");
    expect(openNotes.getByText(/^(Ctrl\+1|⌘1)$/)).toBeInTheDocument();

    cleanup();
    navigation.pathname = "/editor/tasks";
    renderSidebar(true);
    const offEditor = within(screen.getByRole("region", { name: "Open Notes" }));
    expect(offEditor.getByRole("button", { name: "a" })).not.toHaveAttribute("aria-keyshortcuts");
    expect(offEditor.queryByText(/^(Ctrl\+1|⌘1)$/)).not.toBeInTheDocument();
    navigation.pathname = "/editor";
  });

  it("brings an open note to the front of its pane, and back to the editor from a page", () => {
    const twoNotes = { ...left, openFilePaths: ["a.md", "c.md"] };
    navigation.pathname = "/editor/tasks";
    render(
      <Provider>
        <HydrateAtoms initialValues={[
          [atom_sidebarOpen, true],
          [atom_activePaneId, "left"],
          [atom_openFiles, {
            "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
            "c.md": { fileName: "c.md", content: "C changed", lastSavedContent: "C" },
          }],
          [atom_workspaceLayout, { rootContainer: twoNotes }],
        ]}>
          <WorkspaceSidebar />
        </HydrateAtoms>
      </Provider>
    );
    const openNotes = within(screen.getByRole("region", { name: "Open Notes" }));
    // Off the editor, no note is highlighted; unsaved changes show on their row.
    expect(openNotes.getByRole("button", { name: "a" })).not.toHaveAttribute("aria-current");
    fireEvent.click(openNotes.getByRole("button", { name: "c — Unsaved changes" }));
    expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining("c.md"));
    navigation.pathname = "/editor";
  });

  describe("an open note's menu (right-click)", () => {
    function renderTwoNotes(withVault = false) {
      const store = createStore();
      store.set(atom_sidebarOpen, true);
      store.set(atom_activePaneId, "left");
      store.set(atom_openFiles, {
        "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
        "c.md": { fileName: "c.md", content: "C", lastSavedContent: "C" },
      } as never);
      store.set(atom_workspaceLayout, { rootContainer: { ...left, openFilePaths: ["a.md", "c.md"] } } as never);
      if (withVault) {
        store.set(atom_vaultHandle, { name: "Notes" } as never);
        store.set(atom_liveHandles("a.md"), { kind: "file", name: "a.md" } as never);
      }
      render(<Provider store={store}><WorkspaceSidebar /></Provider>);
      return { store, openNotes: within(screen.getByRole("region", { name: "Open Notes" })) };
    }

    it("offers the note's actions and closing the others or all", () => {
      const { store, openNotes } = renderTwoNotes();
      fireEvent.contextMenu(openNotes.getByRole("button", { name: "a" }));

      const menu = screen.getByRole("menu", { name: "a actions" });
      expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
        "Copy Markdown", "Open in pane", "Close", "Close Others", "Close All",
      ]);
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Close Others" }));
      expect((store.get(atom_workspaceLayout).rootContainer as typeof left).openFilePaths).toEqual(["a.md"]);
    });

    it("reorders notes by dragging a row or Alt+arrows, renumbering the shortcuts", () => {
      const { store, openNotes } = renderTwoNotes();
      const paths = () => (store.get(atom_workspaceLayout).rootContainer as typeof left).openFilePaths;
      const rowOf = (name: string) => openNotes.getByRole("button", { name }).parentElement!;
      const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

      // Drop "a" on the bottom half of "c": it lands last. (jsdom's rows
      // measure 0×0 and drag events may drop clientY, so test below, not above.)
      fireEvent.dragStart(rowOf("a"), { dataTransfer });
      fireEvent.dragOver(rowOf("c"), { dataTransfer, clientY: 1 });
      fireEvent.drop(rowOf("c"), { dataTransfer });
      expect(paths()).toEqual(["c.md", "a.md"]);
      expect(openNotes.getByRole("button", { name: "c" })).toHaveAttribute("aria-keyshortcuts", "Control+1 Meta+1");
      // Reordering leaves the note in front as it was.
      expect((store.get(atom_workspaceLayout).rootContainer as typeof left).activeFilePath).toBe("a.md");

      fireEvent.keyDown(openNotes.getByRole("button", { name: "c" }), { key: "ArrowDown", altKey: true });
      expect(paths()).toEqual(["a.md", "c.md"]);
      fireEvent.keyDown(openNotes.getByRole("button", { name: "a" }), { key: "ArrowUp", altKey: true });
      expect(paths()).toEqual(["a.md", "c.md"]);
    });

    it("pins, renames and trashes a vault note from it", () => {
      fileSystem.renameFile.mockClear();
      const { openNotes } = renderTwoNotes(true);
      fireEvent.contextMenu(openNotes.getByRole("button", { name: "a" }));

      const menu = screen.getByRole("menu", { name: "a actions" });
      for (const name of ["Pin Note", "Rename…", "Move to Trash"]) {
        expect(within(menu).getByRole("menuitem", { name })).toBeInTheDocument();
      }
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Rename…" }));
      expect(fileSystem.renameFile).toHaveBeenCalledWith({ kind: "file", name: "a.md" }, undefined, "a.md");
    });
  });

  it("is the library: the vault, Open Notes, the Outline and Files; the rest is the palette's", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true, null, false, { "a.md": { fileName: "a.md", content: "# Plan", lastSavedContent: "" } });

    expect(screen.getByRole("region", { name: "Outline" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Files" })).toBeInTheDocument();
    for (const name of ["Home", "All Notes", "Tags", "Tasks", "Templates", "Trash", "Export", "Settings", "Documentation"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("region", { name: "Open Notes" })).toBeInTheDocument();
    for (const name of ["Pinned", "Recent"]) {
      expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
    }
    // Within the sidebar: the test's own atom probes are <output>s (status).
    expect(within(screen.getByRole("navigation")).queryByRole("status")).not.toBeInTheDocument();
  });

  it("titles its header with the vault's name, beside a button that hides it", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar();
    expect(screen.getByRole("button", { name: "Vault: Notes. Switch vault" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });

  it("titles a browser vault by its name, not its storage folder", () => {
    fileSystem.vaultHandle = { name: "browser-3f2a" };
    renderSidebar(true, { version: 1, kind: "browser", id: "3f2a", displayName: "Journal", createdAt: 1 });
    expect(screen.getByRole("button", { name: "Vault: Journal. Switch vault" })).toBeInTheDocument();
  });

  it("lists pinned notes first in Files, opens one, and unpins it from its menu", async () => {
    const vault = { name: "Notes" };
    fileSystem.vaultHandle = vault;
    const handle = { kind: "file", name: "roadmap.md" };
    const store = createStore();
    store.set(atom_sidebarOpen, true);
    store.set(atom_vaultHandle, vault as never);
    store.set(atom_fileMetadata, {
      "plans/roadmap.md": { path: "plans/roadmap.md", name: "roadmap.md", tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 2, tasks: [], handle },
    });
    store.set(atom_notePins, { "local:Notes": ["plans/roadmap.md"] });
    render(<Provider store={store}><WorkspaceSidebar /></Provider>);

    const list = screen.getByRole("list", { name: "Pinned notes" });
    fireEvent.click(within(list).getByRole("listitem"));
    await waitFor(() => expect(fileSystem.openFile).toHaveBeenCalledWith(handle, "plans/roadmap.md"));

    fireEvent.contextMenu(within(list).getByRole("listitem"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Unpin" }));
    expect(store.get(atom_notePins)).toEqual({});
    expect(screen.queryByRole("list", { name: "Pinned notes" })).not.toBeInTheDocument();
  });

  it("is inert while hidden", () => {
    renderSidebar(false);
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });

  const mountEditor = () => {
    const editor = document.createElement("div");
    editor.className = "editor-canvas";
    editor.innerHTML = '<div class="cm-editor"><div class="cm-content" contenteditable="true"></div></div>';
    document.body.append(editor);
    return { editor, content: editor.querySelector(".cm-content")! };
  };
  // In act(), so the sidebar's re-render (closing it) lands before the check.
  const typeInto = (target: Element) => act(() => {
    target.dispatchEvent(new Event("beforeinput", { bubbles: true }));
  });

  it("stays open when the editor is clicked or typed in", () => {
    renderSidebar();
    const { editor, content } = mountEditor();

    fireEvent.pointerDown(content);
    typeInto(content);
    expect(screen.getByRole("navigation").closest("[inert]")).toBeNull();
    editor.remove();
  });

  it("closes on typing in a note with Close Sidebar While Writing on, not on typing elsewhere", () => {
    localStorage.setItem("closeSidebarWhileWriting", "true");
    fileSystem.vaultHandle = { name: "Notes" };
    render(
      <Provider>
        <HydrateAtoms initialValues={[[atom_sidebarOpen, true], [atom_closeSidebarWhileWriting, true], [atom_vaultHandle, fileSystem.vaultHandle]]}>
          <WorkspaceSidebar />
        </HydrateAtoms>
      </Provider>
    );
    const { editor, content } = mountEditor();

    typeInto(screen.getByRole("navigation"));
    expect(screen.getByRole("navigation").closest("[inert]")).toBeNull();
    typeInto(content);
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
    editor.remove();
    localStorage.removeItem("closeSidebarWhileWriting");
  });

  it("asks the editor for a new note, from any route", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(screen.getByTestId("new-note")).toHaveTextContent("true");
    expect(navigation.push).not.toHaveBeenCalled();
    cleanup();

    navigation.pathname = "/editor/tasks";
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(navigation.push).toHaveBeenCalledWith("/editor");
  });

  it("outlines the note in front as a tree and jumps to a heading", async () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true, null, false, { "a.md": { fileName: "a.md", content: "# Plan\n\n## Goals", lastSavedContent: "" } });

    const plan = screen.getByRole("treeitem", { name: "Plan" });
    expect(plan).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Goals" })).toHaveAttribute("aria-level", "2");

    fireEvent.click(screen.getByRole("treeitem", { name: "Goals" }));
    expect(await screen.findByTestId("scroll-target")).toHaveTextContent('{"path":"a.md","line":3}');
  });

  it("folds and moves through the outline from the keyboard", () => {
    renderSidebar(true, null, false, { "a.md": { fileName: "a.md", content: "# Plan\n## Goals\n# Notes", lastSavedContent: "" } });

    const plan = screen.getByRole("treeitem", { name: "Plan" });
    fireEvent.keyDown(plan, { key: "ArrowLeft" });
    expect(plan).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("treeitem", { name: "Goals" })).not.toBeInTheDocument();

    fireEvent.keyDown(plan, { key: "ArrowRight" });
    fireEvent.keyDown(plan, { key: "ArrowRight" });
    expect(screen.getByRole("treeitem", { name: "Goals" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("treeitem", { name: "Goals" }), { key: "ArrowLeft" });
    expect(plan).toHaveFocus();

    fireEvent.keyDown(plan, { key: "Enter" });
    expect(screen.getByTestId("scroll-target")).toHaveTextContent('{"path":"a.md","line":1}');
  });

  it("marks each heading's level and the section the caret is in, as the Files tree marks the open note", async () => {
    const content = "# Plan\n## Goals\nShip the export\n# Notes";
    const store = createStore();
    store.set(atom_sidebarOpen, true);
    store.set(atom_activePaneId, "left");
    store.set(atom_openFiles, { "a.md": { fileName: "a.md", content, lastSavedContent: content } } as never);
    store.set(atom_workspaceLayout, { rootContainer: left } as never);
    // The caret on line 3, inside Plan › Goals.
    store.set(atom_activeEditorView, {
      dom: { isConnected: true },
      state: { selection: { main: { head: 20 } }, doc: { lineAt: () => ({ number: 3 }) } },
    } as never);
    render(<Provider store={store}><WorkspaceSidebar /></Provider>);

    const goals = screen.getByRole("treeitem", { name: "Goals" });
    expect(goals).toHaveTextContent("H2Goals");
    await waitFor(() => expect(goals).toHaveAttribute("aria-current", "location"));
    expect(goals).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: "Plan" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("treeitem", { name: "Notes" })).not.toHaveAttribute("aria-current");

    // Folded away, the section shows on the heading that holds it.
    fireEvent.keyDown(screen.getByRole("treeitem", { name: "Plan" }), { key: "ArrowLeft" });
    expect(screen.getByRole("treeitem", { name: "Plan" })).toHaveAttribute("aria-current", "location");
  });

  it("has no outline on a page, only on the editor", () => {
    navigation.pathname = "/editor/tasks";
    renderSidebar(true, null, false, { "a.md": { fileName: "a.md", content: "# Plan", lastSavedContent: "" } });
    expect(screen.queryByRole("region", { name: "Outline" })).not.toBeInTheDocument();
  });

  it("has no search of its own: that's the command palette's", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("hides on Escape inside it", () => {
    renderSidebar();
    fireEvent.keyDown(screen.getByRole("button", { name: "New note" }), { key: "Escape" });
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });

  it("remembers a collapsed section", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    cleanup();

    renderSidebar();
    expect(screen.getByRole("button", { name: "Files" })).toHaveAttribute("aria-expanded", "false");
  });

  it("resizes from the keyboard", () => {
    renderSidebar();
    const handle = screen.getByRole("separator", { name: "Resize sidebar" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle).toHaveAttribute("aria-valuenow", "264");
  });
});
