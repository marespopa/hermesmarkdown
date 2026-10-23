import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { version } from "../../../package.json";
import CommandPalette from "./CommandPalette";
import { CommandPaletteProvider, useCommandPalette, useRegisterCommand } from "./CommandPaletteContext";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MASKED_TEXT } from "@/app/utils/note-display";
import {
  atom_activeEditorView,
  atom_commandUseCounts,
  atom_filesFocusRequested,
  atom_notePins,
  atom_palettePinnedItems,
  atom_recentFilePaths,
  atom_sidebarCollapsed,
  atom_sidebarOpen,
} from "@/app/atoms/ui-atoms";

const openFile = vi.fn();
const push = vi.fn();

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openFile }),
}));

let isMobileChrome = false;

// Notes are pinned per vault (note-pin-atoms.ts): a vault named "Notes".
const VAULT = [atom_vaultHandle, { name: "Notes" }] as const;
const pinnedNotes = (...paths: string[]) => [atom_notePins, { "local:Notes": paths }] as const;
let pathname = "/editor";

vi.mock("@/app/hooks/use-mobile-chrome", () => ({
  default: () => isMobileChrome,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

function TestCommand() {
  useRegisterCommand({
    id: "test-command",
    label: "Test command",
    category: "Help",
    shortcut: "Ctrl+T",
    action: vi.fn(),
  });
  useRegisterCommand({
    id: "new-file",
    label: "New file",
    category: "Vault",
    action: vi.fn(),
  });
  return null;
}

function CreateNoteHandler({ onCreate }: { onCreate: (title: string) => Promise<unknown> }) {
  const { setCreateNote } = useCommandPalette();
  React.useEffect(() => {
    setCreateNote(onCreate);
    return () => setCreateNote(null);
  }, [onCreate, setCreateNote]);
  return null;
}

function Hydrate({ values, children }: { values: any[]; children: React.ReactNode }) {
  useHydrateAtoms(values);
  return children;
}

function renderPalette(values: any[] = []) {
  return render(
    <Provider>
      <Hydrate values={values}>
        <CommandPaletteProvider>
          <TestCommand />
          <CommandPalette />
        </CommandPaletteProvider>
      </Hydrate>
    </Provider>,
  );
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isMobileChrome = false;
    pathname = "/editor";
  });

  it("clears the search input without closing the palette", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "draft" } });
    expect(input).toHaveValue("draft");
    expect(screen.getAllByRole("button", { name: "Clear search" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("remains mounted until its exit animation finishes", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await screen.findByRole("combobox");

    vi.useFakeTimers();
    try {
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.getByRole("combobox")).toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(199); });
      expect(screen.getByRole("combobox")).toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens on the top-level menu, without Show Files", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(await screen.findByRole("option", { name: /Search Notes…/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /New file/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Show Files/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Recently Opened Files")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequently Used Commands")).not.toBeInTheDocument();
  });

  it("keeps Settings and the theme out of the footer: the footer is the modes and the version", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    const footer = (await screen.findByText(`v${version}`)).closest("footer")!;
    expect(within(footer).queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(within(footer).queryByRole("button", { name: /Theme/ })).not.toBeInTheDocument();
    expect(within(footer).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Tags", "Tasks", "Headings", "Text", "Templates", "Commands",
    ]);
  });

  it("keeps commands out of the default file search and shows them after >", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });

    const input = await screen.findByRole("combobox");
    expect(screen.queryByText("Test command")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: ">test" } });

    await waitFor(() => expect(screen.getByRole("listbox")).toHaveTextContent("Test command"));
    expect(screen.getByRole("option", { name: /Test command/ })).toHaveTextContent("Ctrl+T");
  });

  it("offers quick-query tips when a search has no matches", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "no-match" } });

    expect(screen.getByText("No matches found")).toBeInTheDocument();
    expect(screen.getByText("Try a file name, or a mode below: #tag, !task, @heading, /text, ~template, >command.")).toBeInTheDocument();
    expect(screen.getByText("🪴")).toHaveAttribute("aria-hidden", "true");
  });

  it("opens command mode from Ctrl/Cmd+Shift+K", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true, shiftKey: true });

    expect(await screen.findByRole("combobox")).toHaveValue(">");
    expect(screen.getByRole("listbox")).toHaveTextContent("Test command");
  });

  it("prioritizes frequently used commands in empty command mode", async () => {
    renderPalette([[atom_commandUseCounts, { "test-command": 3, "new-file": 1 }]]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true, shiftKey: true });

    await screen.findByRole("combobox");
    expect(screen.getAllByRole("option")[0]).toHaveAccessibleName(/Test command/);
  });

  it("cycles command results with Tab and arrow keys", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: ">" } });

    const initialActiveDescendant = input.getAttribute("aria-activedescendant");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const arrowActiveDescendant = input.getAttribute("aria-activedescendant");
    expect(arrowActiveDescendant).not.toBe(initialActiveDescendant);

    fireEvent.keyDown(input, { key: "Tab" });
    const tabActiveDescendant = input.getAttribute("aria-activedescendant");
    expect(tabActiveDescendant).not.toBe(arrowActiveDescendant);

    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(input).toHaveAttribute("aria-activedescendant", arrowActiveDescendant);
  });

  it("keeps the mode in the query, its footer chip lit", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "#plan" } });
    expect(input).toHaveValue("#plan");
    expect(screen.getByRole("button", { name: "Tags" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Explorer" })).not.toBeInTheDocument();
  });

  function renderPaletteWithStore() {
    const store = createStore();
    store.set(atom_sidebarCollapsed, { Files: true });
    render(
      <Provider store={store}>
        <CommandPaletteProvider>
          <CommandPalette />
        </CommandPaletteProvider>
      </Provider>,
    );
    return store;
  }

  it("Show Files on desktop shows the sidebar's Files tree instead of navigating", async () => {
    const store = renderPaletteWithStore();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    fireEvent.change(await screen.findByRole("combobox"), { target: { value: ">show files" } });
    fireEvent.click(screen.getByRole("option", { name: /Show Files/ }));
    await waitFor(() => expect(store.get(atom_sidebarOpen)).toBe(true));
    expect(store.get(atom_sidebarCollapsed).Files).toBe(false);
    expect(store.get(atom_filesFocusRequested)).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("Show Files from outside the editor comes back to it", async () => {
    pathname = "/documentation";
    const store = renderPaletteWithStore();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    fireEvent.change(await screen.findByRole("combobox"), { target: { value: ">show files" } });
    fireEvent.click(screen.getByRole("option", { name: /Show Files/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor"));
    expect(store.get(atom_sidebarOpen)).toBe(true);
  });

  it("Show Files on mobile opens the Files page", async () => {
    isMobileChrome = true;
    const store = renderPaletteWithStore();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    fireEvent.change(await screen.findByRole("combobox"), { target: { value: ">show files" } });
    fireEvent.click(screen.getByRole("option", { name: /Show Files/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor/files"));
    expect(store.get(atom_sidebarOpen)).toBe(false);
  });

  it("lists Show Files once", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.change(await screen.findByRole("combobox"), { target: { value: ">files" } });

    expect(screen.getAllByRole("option", { name: /Show Files/ })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: /Explorer/ })).not.toBeInTheDocument();
  });

  it("closes before a slow file open finishes, so the palette never looks frozen", async () => {
    const handle = { kind: "file", name: "Roadmap.md" };
    let finishOpen: () => void = () => undefined;
    openFile.mockImplementationOnce(() => new Promise<void>((resolve) => { finishOpen = resolve; }));
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle,
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "road" } });

    fireEvent.click(screen.getByRole("option", { name: /Roadmap.md/ }));

    // The open is still pending here, yet the palette is already gone.
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(openFile).toHaveBeenCalledWith(handle, "Roadmap.md");
    await act(async () => finishOpen());
  });

  it("opens a file directly from an exact tag search", async () => {
    const handle = { kind: "file", name: "Roadmap.md" };
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle,
          tags: ["planning"], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "#planning" } });

    fireEvent.click(screen.getByRole("option", { name: /Roadmap.md/ }));

    await waitFor(() => expect(openFile).toHaveBeenCalledWith(handle, "Roadmap.md"));
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a matched tag in a # search as a #tag pill", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: ["planning", "idea"], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "#plan" } });
    const option = screen.getByRole("option", { name: /Roadmap.md/ });
    expect(option.getAttribute("aria-label")).toContain("#planning");
    expect(option.textContent).toContain("#planning");
  });

  it("lists pinned and recent notes, then the menu, without section labels", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Projects/Roadmap.md": {
          path: "Projects/Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
      VAULT,
      pinnedNotes("Projects/Roadmap.md"),
      [atom_recentFilePaths, ["Projects/Roadmap.md"]],
      [atom_commandUseCounts, { "test-command": 3 }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(await screen.findByRole("option", { name: "Roadmap.md Projects" })).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAccessibleName("Roadmap.md Projects");
    expect(options[1]).toHaveAccessibleName(/Search Notes…/);
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Test command");
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequently Used Commands")).not.toBeInTheDocument();
  });

  it("pins and opens the selected item with keyboard shortcuts", async () => {
    renderPalette([
      VAULT,
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "road" } });

    fireEvent.keyDown(input, { key: "d", ctrlKey: true });
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Roadmap.md");

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    await waitFor(() => expect(openFile).toHaveBeenCalledWith(expect.anything(), "Roadmap.md"));
  });

  it("offers row pinning through the context menu", async () => {
    renderPalette([
      VAULT,
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "road" } });
    fireEvent.contextMenu(screen.getByRole("option"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Pin item/ }));
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByRole("listbox")).toHaveTextContent("Roadmap.md");
  });

  it("asks for a vault before pinning a note", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "road" } });
    fireEvent.keyDown(input, { key: "d", ctrlKey: true });
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Roadmap.md");
  });

  it("moves notes it pinned on its own into the vault's pinned notes", async () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <Hydrate values={[
          VAULT,
          [atom_palettePinnedItems, [{ kind: "file", id: "Roadmap.md" }, { kind: "command", id: "test-command" }]],
        ]}>
          <CommandPaletteProvider>
            <TestCommand />
            <CommandPalette />
          </CommandPaletteProvider>
        </Hydrate>
      </Provider>,
    );
    await waitFor(() => expect(store.get(atom_notePins)).toEqual({ "local:Notes": ["Roadmap.md"] }));
    expect(store.get(atom_palettePinnedItems)).toEqual([{ kind: "command", id: "test-command" }]);
  });

  it("keeps Ctrl/Cmd+Enter in the active-pane file-open workflow", async () => {
    const handle = { kind: "file", name: "Roadmap.md" };
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle,
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");
    fireEvent.change(input, { target: { value: "road" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(openFile).toHaveBeenCalledWith(handle, "Roadmap.md"));
  });

  it("shows files matching fuzzy tag searches and excludes untagged files", async () => {
    const linkedHandle = { kind: "file", name: "Roadmap.md" };
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md",
          name: "Roadmap.md",
          handle: linkedHandle,
          tags: ["planning"],
          links: [],
          frontmatter: {},
          modifiedAt: 1,
          wordCount: 1,
          tasks: [],
        },
        "Archive.md": {
          path: "Archive.md",
          name: "Archive.md",
          handle: { kind: "file", name: "Archive.md" },
          tags: ["archive"],
          links: [],
          frontmatter: {},
          modifiedAt: 1,
          wordCount: 1,
          tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "#plan" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Roadmap.md");
    expect(screen.getByRole("listbox")).toHaveTextContent("#planning");
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Archive.md");

  });

  it("shows the parent folder for file and tag search results", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Projects/2026/Roadmap.md": {
          path: "Projects/2026/Roadmap.md",
          name: "Roadmap.md",
          handle: { kind: "file", name: "Roadmap.md" },
          tags: ["planning"],
          links: [],
          frontmatter: {},
          modifiedAt: 1,
          wordCount: 1,
          tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "road" } });
    expect(screen.getByRole("option", { name: "Roadmap.md Projects/2026" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "#plan" } });
    expect(screen.getByRole("option", { name: "Roadmap.md #planning Projects/2026" })).toBeInTheDocument();
  });

  it("does not route to the Files page when choosing a fuzzy tag match", async () => {
    const handle = { kind: "file", name: "Roadmap.md" };
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md",
          name: "Roadmap.md",
          handle,
          tags: ["planning"],
          links: [],
          frontmatter: {},
          modifiedAt: 1,
          wordCount: 1,
          tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "#plan" } });
    fireEvent.click(screen.getAllByRole("option")[0]);

    await waitFor(() => expect(openFile).toHaveBeenCalledWith(handle, "Roadmap.md"));
    expect(push).not.toHaveBeenCalled();
  });

  it("intersects space- and comma-separated tag searches", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: ["planning", "work"], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
        "Planning.md": {
          path: "Planning.md", name: "Planning.md", handle: { kind: "file", name: "Planning.md" },
          tags: ["planning"], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
        "Work.md": {
          path: "Work.md", name: "Work.md", handle: { kind: "file", name: "Work.md" },
          tags: ["work"], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "#plan #work" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("#planning#work");
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Planning.md");
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Work.md");

    fireEvent.change(input, { target: { value: "#plan, #work" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("#planning#work");
  });

  it("searches tasks with !", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Work.md": {
          path: "Work.md",
          name: "Work.md",
          handle: { kind: "file", name: "Work.md" },
          tags: [],
          links: [],
          frontmatter: {},
          modifiedAt: 1,
          wordCount: 3,
          tasks: [{
            id: "Work.md#0",
            path: "Work.md",
            line: 0,
            checked: false,
            status: "todo",
            dueDate: null,
            priority: null,
            startedDate: null,
            doneDate: null,
            tags: [],
            text: "Ship command palette",
            raw: "- [ ] Ship command palette",
            lineHash: "hash",
          }],
        },
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "!ship" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Ship command palette");
    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(push).toHaveBeenCalledWith("/editor/tasks");
    expect(openFile).not.toHaveBeenCalled();
  });

  it("searches headings in the active editor and navigates to the selected heading", async () => {
    const dispatch = vi.fn();
    const focus = vi.fn();
    const lines = [
      { text: "# Introduction", from: 0 },
      { text: "Body", from: 15 },
      { text: "## Deployment Guide", from: 20 },
    ];
    const activeEditorView = {
      state: {
        doc: {
          lines: lines.length,
          line: (lineNumber: number) => lines[lineNumber - 1],
        },
      },
      dispatch,
      focus,
    };
    renderPalette([[atom_activeEditorView, activeEditorView]]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "@deploy" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Deployment Guide");
    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      selection: { anchor: 20 },
      effects: expect.anything(),
    }));
    expect(focus).toHaveBeenCalled();
  });

  it("closes before running a closeFirst command, so its result shows at once", async () => {
    const palette = { isOpen: false };
    const action = vi.fn(() => palette.isOpen);
    function HandOff() {
      palette.isOpen = useCommandPalette().isOpen;
      useRegisterCommand({ id: "insert-template", label: "Insert template…", closeFirst: true, action });
      return null;
    }
    render(
      <Provider>
        <CommandPaletteProvider>
          <HandOff />
          <CommandPalette />
        </CommandPaletteProvider>
      </Provider>,
    );
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(await screen.findByRole("option", { name: /Insert template…/ }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action).toHaveReturnedWith(false);
  });

  it("lists the pages it opens after the actions, set apart and marked", async () => {
    function Pages() {
      useRegisterCommand({ id: "open-settings", label: "Open Settings", opens: "page", action: vi.fn() });
      useRegisterCommand({ id: "open-documentation", label: "Open Documentation", opens: "tab", action: vi.fn() });
      return null;
    }
    render(
      <Provider>
        <CommandPaletteProvider>
          <TestCommand />
          <Pages />
          <CommandPalette />
        </CommandPaletteProvider>
      </Provider>,
    );
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await screen.findByRole("option", { name: /Search Notes…/ });

    expect(screen.getAllByRole("option").map((option) => option.getAttribute("aria-label"))).toEqual([
      expect.stringContaining("Search Notes…"), "New file", "Open Settings", "Open Documentation (opens in a new tab)",
    ]);
    expect(within(screen.getByRole("listbox")).getAllByRole("presentation")).toHaveLength(1);
  });

  it("Search Notes… switches to note text search without closing", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(await screen.findByRole("option", { name: /Search Notes…/ }));

    expect(screen.getByRole("combobox")).toHaveValue("/");
  });

  describe("menus", () => {
    const improve = vi.fn();
    function MenuCommand() {
      const { openMenu } = useCommandPalette();
      useRegisterCommand({
        id: "ai-menu",
        label: "Ask or Edit with AI…",
        category: "AI",
        action: vi.fn(),
        subcommands: [
          { id: "ai-builder", label: "Freeform Prompt", description: "Ask anything in AI Chat", action: vi.fn() },
          {
            id: "ai-mode-improve", label: "Improve Writing", description: "Fix grammar, adjust tone, format", action: vi.fn(),
            subcommands: [
              { id: "ai-improve", label: "Improve writing", action: improve },
              { id: "ai-fix-grammar", label: "Fix spelling and grammar", action: vi.fn() },
            ],
          },
        ],
      });
      return <button type="button" onClick={() => openMenu("ai-menu")}>Open AI menu</button>;
    }
    function renderWithMenu() {
      return render(
        <Provider>
          <CommandPaletteProvider>
            <TestCommand />
            <MenuCommand />
            <CommandPalette />
          </CommandPaletteProvider>
        </Provider>,
      );
    }

    it("is in the top-level menu and opens in place, showing what each mode does", async () => {
      renderWithMenu();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      fireEvent.click(await screen.findByRole("option", { name: /Ask or Edit with AI…/ }));

      const input = screen.getByRole("combobox");
      expect(input).toHaveAttribute("placeholder", "Ask or Edit with AI…");
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Freeform PromptAsk anything in AI Chat",
        "Improve WritingFix grammar, adjust tone, format",
      ]);

      fireEvent.click(screen.getByRole("option", { name: /Improve Writing/ }));
      expect(input).toHaveAttribute("placeholder", "Ask or Edit with AI › Improve Writing…");
      fireEvent.click(screen.getByRole("option", { name: "Improve writing" }));
      await waitFor(() => expect(improve).toHaveBeenCalledOnce());
    });

    it("searches the actions inside its modes, and Backspace goes back a level", async () => {
      renderWithMenu();
      fireEvent.click(screen.getByRole("button", { name: "Open AI menu" }));
      const input = await screen.findByRole("combobox");

      fireEvent.change(input, { target: { value: "grammar" } });
      expect(screen.getByRole("option", { name: /Fix spelling and grammar/ })).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByRole("option", { name: /Improve Writing/ }));
      fireEvent.keyDown(input, { key: "Backspace" });
      expect(input).toHaveAttribute("placeholder", "Ask or Edit with AI…");
      fireEvent.keyDown(input, { key: "Backspace" });
      expect(screen.getByRole("option", { name: /Search Notes…/ })).toBeInTheDocument();
    });
  });

  it("enters a mode from its footer chip, as its prefix would, and leaves it on a second click", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.click(screen.getByRole("button", { name: "Commands" }));
    expect(input).toHaveValue(">");
    expect(screen.getByRole("button", { name: "Commands" })).toHaveAttribute("aria-pressed", "true");
    expect(input).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Tags" }));
    expect(input).toHaveValue("#");
    fireEvent.click(screen.getByRole("button", { name: "Tags" }));
    expect(input).toHaveValue("");
    expect(screen.getByRole("button", { name: "Tags" })).toHaveAttribute("aria-pressed", "false");
  });

  describe("~ templates", () => {
    const templateFiles = Object.fromEntries(["templates/Meeting.md", "templates/Journal/Daily.md", "Notes/Plan.md"].map((path) => [path, {
      path, name: path.split("/").at(-1)!, handle: { kind: "file", name: path.split("/").at(-1)! },
      tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
    }]));

    it("lists the vault's templates with their pack, and inserts the chosen one into the note in front", async () => {
      const inserted = vi.fn();
      document.addEventListener("hermes:insert-vault-template", inserted);
      renderPalette([[atom_fileMetadata, templateFiles], [atom_activeEditorView, {} as never]]);
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      fireEvent.change(await screen.findByRole("combobox"), { target: { value: "~" } });

      expect(screen.getByRole("option", { name: "Daily Journal" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Meeting" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /Plan/ })).not.toBeInTheDocument();

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "~meet" } });
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
      await waitFor(() => expect(inserted).toHaveBeenCalledOnce());
      expect((inserted.mock.calls[0][0] as CustomEvent).detail.entry).toMatchObject({ name: "Meeting", path: "templates/Meeting.md" });
      document.removeEventListener("hermes:insert-vault-template", inserted);
    });

    it("says so when the vault has no templates", async () => {
      renderPalette();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      fireEvent.click(await screen.findByRole("button", { name: "Templates" }));

      expect(screen.getByText("No templates yet. Open Templates to add one or a pack.")).toBeInTheDocument();
    });
  });

  describe("Create row", () => {
    function renderWithCreate(onCreate: (title: string) => Promise<unknown>, values: any[] = []) {
      return render(
        <Provider>
          <Hydrate values={values}>
            <CommandPaletteProvider>
              <CreateNoteHandler onCreate={onCreate} />
              <CommandPalette />
            </CommandPaletteProvider>
          </Hydrate>
        </Provider>,
      );
    }

    it("offers to create a note named after the query and runs it", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined);
      renderWithCreate(onCreate);
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      const input = await screen.findByRole("combobox");
      fireEvent.change(input, { target: { value: "Trip ideas" } });
      fireEvent.click(await screen.findByRole("option", { name: /Create "Trip ideas"/ }));

      await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Trip ideas"));
    });

    it("isn't offered when a note already has that title", async () => {
      renderWithCreate(vi.fn(), [[atom_fileMetadata, {
        "Trip ideas.md": { path: "Trip ideas.md", name: "Trip ideas.md", tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0, tasks: [], handle: {} },
      }]]);
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      fireEvent.change(await screen.findByRole("combobox"), { target: { value: "trip ideas" } });
      expect(screen.queryByRole("option", { name: /Create/ })).not.toBeInTheDocument();
    });

    it("isn't offered in command mode or without a handler", async () => {
      renderWithCreate(vi.fn());
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      fireEvent.change(await screen.findByRole("combobox"), { target: { value: ">new" } });
      expect(screen.queryByRole("option", { name: /Create/ })).not.toBeInTheDocument();
    });
  });

  describe("search anchor morph", () => {
    // A transition whose update runs right away and that settles normally.
    const transitionRunning = (callback: () => unknown) => {
      void callback();
      return { ready: Promise.resolve(), finished: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    };
    const addAnchor = () => {
      const anchor = document.createElement("button");
      anchor.setAttribute("data-palette-anchor", "");
      document.body.appendChild(anchor);
    };

    afterEach(() => {
      delete (document as any).startViewTransition;
      delete (document as any).hidden;
      document.querySelectorAll("[data-palette-anchor]").forEach((element) => element.remove());
    });

    it("opens through a view transition when a search anchor is on screen", async () => {
      const startViewTransition = vi.fn(transitionRunning);
      (document as any).startViewTransition = startViewTransition;
      const anchor = document.createElement("button");
      anchor.setAttribute("data-palette-anchor", "");
      document.body.appendChild(anchor);

      renderPalette();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      expect(await screen.findByRole("combobox")).toBeInTheDocument();
      expect(startViewTransition).toHaveBeenCalledTimes(1);

      // Once the transition has settled the panel must not replay its own
      // enter animation (that re-fade was a visible flicker).
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      expect(document.querySelector('[class~="zoom-in-[0.98]"]')).toBeNull();
    });

    it("opens directly without an anchor", async () => {
      const startViewTransition = vi.fn(transitionRunning);
      (document as any).startViewTransition = startViewTransition;

      renderPalette();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      expect(await screen.findByRole("combobox")).toBeInTheDocument();
      expect(startViewTransition).not.toHaveBeenCalled();
      // A normal open keeps the panel's own enter animation.
      expect(document.querySelector('[class~="zoom-in-[0.98]"]')).not.toBeNull();
    });

    it("opens directly while the page is hidden", async () => {
      const startViewTransition = vi.fn(transitionRunning);
      (document as any).startViewTransition = startViewTransition;
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      addAnchor();

      renderPalette();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      expect(await screen.findByRole("combobox")).toBeInTheDocument();
      expect(startViewTransition).not.toHaveBeenCalled();
    });

    it("still opens when the browser aborts the transition", async () => {
      const aborted = () => Promise.reject(new DOMException("Transition was aborted because of invalid state", "InvalidStateError"));
      (document as any).startViewTransition = vi.fn((callback: () => unknown) => {
        void callback();
        return { ready: aborted(), finished: aborted(), updateCallbackDone: Promise.resolve() };
      });
      addAnchor();
      const unhandled = vi.fn();
      process.on("unhandledRejection", unhandled);

      renderPalette();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      expect(await screen.findByRole("combobox")).toBeInTheDocument();
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
      process.off("unhandledRejection", unhandled);
      expect(unhandled).not.toHaveBeenCalled();
    });
  });

  describe("private notes", () => {
    const SECRET_TASK = "Wire the secret payment";
    const privateNotes = {
      "Payroll.md": {
        path: "Payroll.md", name: "Payroll.md", handle: { kind: "file", name: "Payroll.md" },
        tags: ["finance"], links: [], frontmatter: { private: "true" }, modifiedAt: 2, wordCount: 3,
        tasks: [{
          id: "Payroll.md#4", path: "Payroll.md", line: 4, status: "todo", checked: false,
          dueDate: null, priority: null, startedDate: null, doneDate: null, tags: ["money"], text: SECRET_TASK, raw: `- [ ] ${SECRET_TASK}`, lineHash: "hash",
        }],
      },
      "Planning.md": {
        path: "Planning.md", name: "Planning.md", handle: { kind: "file", name: "Planning.md" },
        tags: ["finance"], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
      },
    };

    async function search(value: string) {
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      fireEvent.change(await screen.findByRole("combobox"), { target: { value } });
    }

    it("marks a private file row with a lock", async () => {
      renderPalette([[atom_fileMetadata, privateNotes]]);
      await search("md");
      const row = screen.getByRole("option", { name: /Payroll\.md/ });
      expect(row).toHaveAccessibleName(/\(private\)/);
      expect(within(row).getByLabelText("Private note")).toBeInTheDocument();
      expect(within(screen.getByRole("option", { name: /Planning\.md/ })).queryByLabelText("Private note")).toBeNull();
    });

    it("leaves private files out of search, #tag, recent and pinned rows in hidden mode", async () => {
      renderPalette([
        [atom_fileMetadata, privateNotes],
        [atom_privacyLevel, "hidden"],
        VAULT,
        pinnedNotes("Payroll.md"),
        [atom_recentFilePaths, ["Payroll.md", "Planning.md"]],
      ]);
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      const input = await screen.findByRole("combobox");
      expect(screen.getByRole("listbox")).toHaveTextContent("Planning.md");
      expect(screen.getByRole("listbox")).not.toHaveTextContent("Payroll");

      fireEvent.change(input, { target: { value: "payroll" } });
      expect(screen.queryByRole("option", { name: /Payroll\.md/ })).not.toBeInTheDocument();

      fireEvent.change(input, { target: { value: "#finance" } });
      expect(screen.getByRole("option", { name: /Planning\.md/ })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /Payroll\.md/ })).not.toBeInTheDocument();
    });

    it("lists a masked task for an empty ! query, never its text", async () => {
      renderPalette([[atom_fileMetadata, privateNotes]]);
      await search("!");
      const row = screen.getByRole("option", { name: /Private task/ });
      expect(row).toHaveTextContent(MASKED_TEXT);
      expect(row).toHaveTextContent("Payroll.md:5");
      expect(document.body.textContent).not.toContain(SECRET_TASK);
    });

    it("never matches a masked task by its text", async () => {
      renderPalette([[atom_fileMetadata, privateNotes]]);
      await search("!secret");
      expect(screen.queryByRole("option", { name: /Private task/ })).not.toBeInTheDocument();
      expect(screen.getByText("No matches found")).toBeInTheDocument();
    });
  });
});
