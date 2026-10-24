import React from "react";
import { act, render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore, Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_activePaneId, atom_openFiles, atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_closeSidebarWhileWriting, atom_filesFocusRequested, atom_filesRevealPath, atom_newNoteRequested, atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_pinsState } from "@/app/atoms/pin-atoms";
import WorkspaceSidebar from "./WorkspaceSidebar";

const fileSystem = vi.hoisted(() => ({
  vaultHandle: null as unknown,
  createNewFile: vi.fn(),
  createFolder: vi.fn(),
  openFile: vi.fn(async () => {}),
  renameFile: vi.fn(),
  treeController: null as null | { startCreate: () => void; focus: () => void; reveal: (path: string) => void; openBackgroundMenu?: (x: number, y: number) => boolean },
}));

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/editor" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

// The Pinned section's writes; its behaviour is SidebarPinned.test.tsx.
vi.mock("@/app/services/vault-pins", () => ({
  PinsFileInvalidError: class extends Error {},
  PinsFileNewerError: class extends Error {},
  updatePinsFile: vi.fn(),
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

const vaultMenu = vi.hoisted(() => ({ openRecent: vi.fn(), open: vi.fn() }));
vi.mock("../hooks/use-vault-menu-items", () => ({
  useVaultMenuItems: () => [
    { label: "Notes", onClick: vaultMenu.openRecent },
    { label: "Work", onClick: vaultMenu.openRecent },
    { label: "Open Vault…", icon: "icon", divider: true, onClick: vaultMenu.open },
  ],
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

const left = { id: "left", openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false };

const renderSidebar = (open = true, descriptor: unknown = null, focusRequested = false, openFiles: Record<string, unknown> = {}, leftActive = "a.md", metadata: Record<string, unknown> = {}, revealPath: string | null = null) =>
  render(
    <Provider>
      <HydrateAtoms initialValues={[
        [atom_sidebarOpen, open],
        [atom_activePaneId, "left"],
        [atom_filesFocusRequested, focusRequested],
        [atom_filesRevealPath, revealPath],
        [atom_vaultHandle, fileSystem.vaultHandle],
        [atom_vaultDescriptor, descriptor],
        [atom_fileMetadata, metadata as never],
        [atom_openFiles, {
          "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A" },
          "b.md": { fileName: "b.md", content: "B changed", lastSavedContent: "B" },
          ...openFiles,
        }],
        [atom_workspaceLayout, { rootContainer: { ...left, openFilePaths: [leftActive], activeFilePath: leftActive } }],
      ]}>
        <WorkspaceSidebar />
        <ActivePane />
        <FocusRequest />
        <NewNoteRequest />
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
    fileSystem.treeController = { startCreate: vi.fn(), focus, reveal: vi.fn() };
    renderSidebar(true, null, true);

    expect(focus).toHaveBeenCalledOnce();
    expect(screen.getByTestId("focus-request")).toHaveTextContent("false");
  });

  it("reveals the folder Show in Files asked for instead of the tree's own row", () => {
    const focus = vi.fn();
    const reveal = vi.fn();
    fileSystem.vaultHandle = { name: "vault" };
    fileSystem.treeController = { startCreate: vi.fn(), focus, reveal };
    renderSidebar(true, null, true, {}, "a.md", {}, "Projects/Launch");

    expect(reveal).toHaveBeenCalledWith("Projects/Launch");
    expect(focus).not.toHaveBeenCalled();
    expect(screen.getByTestId("focus-request")).toHaveTextContent("false");
  });

  it("leaves the tree alone without a focus request", () => {
    const focus = vi.fn();
    fileSystem.vaultHandle = { name: "vault" };
    fileSystem.treeController = { startCreate: vi.fn(), focus, reveal: vi.fn() };
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

  it("has no Files menu without a vault", () => {
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

  it("is the library: the vault and Files, with no Open Notes or Outline; the rest is the palette's", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true, null, false, { "a.md": { fileName: "a.md", content: "# Plan", lastSavedContent: "" } });

    expect(screen.getByRole("region", { name: "Files" })).toBeInTheDocument();
    for (const name of ["Home", "All Notes", "Tags", "Tasks", "Templates", "Trash", "Export", "Settings", "Documentation"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    for (const name of ["Pinned", "Recent", "Open Notes", "Outline", "Linked from"]) {
      expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
    }
    // Within the sidebar: the test's own atom probes are <output>s (status).
    expect(within(screen.getByRole("navigation")).queryByRole("status")).not.toBeInTheDocument();
  });

  it("switches vaults from its header: the open vault's name opens the vault menu", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar();
    expect(screen.queryByText("HermesMarkdown")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch vault: Notes" }));
    const menu = screen.getByRole("menu", { name: "Switch vault" });
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Notes" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(menu).getByText("Open Vault…"));
    expect(vaultMenu.open).toHaveBeenCalled();
  });

  it("hides from its Hide sidebar button", () => {
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
    expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
  });

  it("lists the vault's pins first, in file order", () => {
    const vault = { name: "Notes" };
    fileSystem.vaultHandle = vault;
    const store = createStore();
    store.set(atom_sidebarOpen, true);
    store.set(atom_vaultHandle, vault as never);
    store.set(atom_workspaceLayout, { rootContainer: { ...left } });
    store.set(atom_openFiles, { "a.md": { fileName: "a.md", content: "A", lastSavedContent: "A", activeFilePath: "a.md" } });
    store.set(atom_pinsState, {
      vault: vault as never,
      status: "ok",
      pins: [
        { kind: "tag", target: "release", icon: null },
        { kind: "page", target: "tasks", icon: null },
        { kind: "folder", target: "projects", icon: "🚀" },
      ],
    });
    render(<Provider store={store}><WorkspaceSidebar /></Provider>);

    const sections = screen.getAllByRole("region").map((section) => section.getAttribute("aria-label"));
    expect(sections[0]).toBe("Pinned");
    const pinned = screen.getByRole("list", { name: "Pinned" });
    expect(within(pinned).getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^##release(Ctrl\+1|⌘1)$/),
      expect.stringMatching(/^Tasks(Ctrl\+2|⌘2)$/),
      expect.stringMatching(/^🚀projects(Ctrl\+3|⌘3)$/),
    ]);
  });

  it("opens the Files root menu on a right-click in the sidebar, not in Pinned or the Search field", () => {
    const vault = { name: "Notes" };
    const openBackgroundMenu = vi.fn(() => true);
    fileSystem.vaultHandle = vault;
    fileSystem.treeController = { startCreate: vi.fn(), focus: vi.fn(), reveal: vi.fn(), openBackgroundMenu };
    const store = createStore();
    store.set(atom_sidebarOpen, true);
    store.set(atom_vaultHandle, vault as never);
    store.set(atom_workspaceLayout, { rootContainer: { ...left } });
    store.set(atom_pinsState, { vault: vault as never, status: "ok", pins: [{ kind: "page", target: "tasks", icon: null }] });
    render(<Provider store={store}><WorkspaceSidebar /></Provider>);

    fireEvent.contextMenu(screen.getByRole("region", { name: "Pinned" }));
    fireEvent.contextMenu(screen.getByRole("textbox", { name: "Search files" }));
    expect(openBackgroundMenu).not.toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByRole("region", { name: "Files" }), { clientX: 40, clientY: 300 });
    expect(openBackgroundMenu).toHaveBeenCalledWith(40, 300);
  });

  it("has no Pinned section with nothing pinned", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar();
    expect(screen.queryByRole("list", { name: "Pinned" })).not.toBeInTheDocument();
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

  it("has no search of its own, only the Files search: searching notes is the command palette's", () => {
    fileSystem.vaultHandle = { name: "Notes" };
    renderSidebar(true);
    expect(screen.getAllByRole("textbox").map((box) => box.getAttribute("aria-label"))).toEqual(["Search files"]);
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
