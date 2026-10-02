import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { version } from "../../../package.json";
import CommandPalette from "./CommandPalette";
import { CommandPaletteProvider, useCommandPalette, useRegisterCommand } from "./CommandPaletteContext";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { MASKED_TEXT } from "@/app/utils/note-display";
import {
  atom_activeEditorView,
  atom_commandUseCounts,
  atom_palettePinnedItems,
  atom_recentFilePaths,
  atom_theme,
} from "@/app/atoms/ui-atoms";

const openFile = vi.fn();
const push = vi.fn();

vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openFile }),
}));

vi.mock("@/app/hooks/use-mobile-chrome", () => ({
  default: () => false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/editor",
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

  it("shows a unified default list with the Explorer action", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(await screen.findByRole("option", { name: /Open Explorer/ })).toBeInTheDocument();
    expect(screen.queryByText("Recently Opened Files")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequently Used Commands")).not.toBeInTheDocument();
  });

  it("cycles the theme from the palette header", async () => {
    renderPalette([[atom_theme, "system"]]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    fireEvent.click(await screen.findByRole("button", { name: "Theme: System" }));
    expect(screen.getByRole("button", { name: "Theme: Light" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Theme: Light" }));
    expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Theme: Dark" }));
    expect(screen.getByRole("button", { name: "Theme: System" })).toBeInTheDocument();
  });

  it("opens Settings from the palette header", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

    expect(push).toHaveBeenCalledWith("/editor/settings");
  });

  it("shows the app version without a help button in the footer", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(await screen.findByText(`HermesMarkdown v${version}`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Documentation and help" })).not.toBeInTheDocument();
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
    expect(screen.getByText("Try a file name, #tag, >command, !task, or @heading.")).toBeInTheDocument();
    expect(screen.getByText("🪴")).toHaveAttribute("aria-hidden", "true");
  });

  it("opens command mode from Ctrl/Cmd+Shift+K", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true, shiftKey: true });

    expect(await screen.findByRole("combobox")).toHaveValue(">");
    expect(screen.getByRole("listbox")).toHaveTextContent("Test command");
  });

  it("stays closed on Ctrl/Cmd+Alt+P, the Edit / Preview shortcut", () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "p", code: "KeyP", ctrlKey: true, altKey: true });

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
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

  it("keeps modes in the query without scope controls", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "#plan" } });
    expect(input).toHaveValue("#plan");
    expect(screen.queryByRole("button", { name: "Tags" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Commands" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Explorer" })).not.toBeInTheDocument();
  });

  it("opens Explorer from the initial unified action list", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    fireEvent.click(await screen.findByRole("option", { name: /Open Explorer/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/editor/files"));
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

  it("combines pinned, recent, and frequent items without section labels", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Projects/Roadmap.md": {
          path: "Projects/Roadmap.md", name: "Roadmap.md", handle: { kind: "file", name: "Roadmap.md" },
          tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 1, tasks: [],
        },
      }],
      [atom_palettePinnedItems, [{ kind: "file", id: "Projects/Roadmap.md" }]],
      [atom_recentFilePaths, ["Projects/Roadmap.md"]],
      [atom_commandUseCounts, { "test-command": 3 }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(await screen.findByRole("option", { name: "Roadmap.md Projects" })).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toHaveTextContent("Test command");
    expect(screen.getByRole("listbox")).toHaveTextContent("Open Explorer");
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    expect(screen.queryByText("Frequently Used Commands")).not.toBeInTheDocument();
  });

  it("pins and opens the selected item with keyboard shortcuts", async () => {
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
    expect(screen.getByRole("listbox")).toHaveTextContent("Roadmap.md");

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    await waitFor(() => expect(openFile).toHaveBeenCalledWith(expect.anything(), "Roadmap.md"));
  });

  it("offers row pinning through the context menu", async () => {
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
    fireEvent.contextMenu(screen.getByRole("option"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Pin item/ }));
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByRole("listbox")).toHaveTextContent("Roadmap.md");
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

  it("does not route to Explorer when choosing a fuzzy tag match", async () => {
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
    expect(screen.getByRole("listbox")).toHaveTextContent("#planning #work");
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Planning.md");
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Work.md");

    fireEvent.change(input, { target: { value: "#plan, #work" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("#planning #work");
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
            inProgress: false,
            onHold: false,
            dueDate: null,
            priority: null,
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

  it("toggles command mode with the > button and keeps actions in the footer", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.click(screen.getByRole("button", { name: "Search commands" }));
    expect(input).toHaveValue(">");
    expect(screen.getByRole("button", { name: "Search files" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Search files" }));
    expect(input).toHaveValue("");

    const footer = screen.getByText(`HermesMarkdown v${version}`).closest("footer")!;
    expect(footer).toContainElement(screen.getByRole("button", { name: "Settings" }));
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
    afterEach(() => {
      delete (document as any).startViewTransition;
      document.querySelectorAll("[data-palette-anchor]").forEach((element) => element.remove());
    });

    it("opens through a view transition when a search anchor is on screen", async () => {
      const startViewTransition = vi.fn((callback: () => unknown) => { void callback(); return { finished: Promise.resolve() }; });
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
      expect(document.querySelector(".slide-in-from-top-1")).toBeNull();
    });

    it("opens directly without an anchor", async () => {
      const startViewTransition = vi.fn((callback: () => unknown) => { void callback(); return { finished: Promise.resolve() }; });
      (document as any).startViewTransition = startViewTransition;

      renderPalette();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      expect(await screen.findByRole("combobox")).toBeInTheDocument();
      expect(startViewTransition).not.toHaveBeenCalled();
      // A normal open keeps the panel's own enter animation.
      expect(document.querySelector(".slide-in-from-top-1")).not.toBeNull();
    });
  });

  describe("sensitive notes", () => {
    const SECRET_TASK = "Wire the secret payment";
    const privateNotes = {
      "Payroll.md": {
        path: "Payroll.md", name: "Payroll.md", handle: { kind: "file", name: "Payroll.md" },
        tags: ["finance"], links: [], frontmatter: { sensitive: "true" }, modifiedAt: 2, wordCount: 3,
        tasks: [{
          id: "Payroll.md#4", path: "Payroll.md", line: 4, checked: false, inProgress: false, onHold: false,
          dueDate: null, priority: null, tags: ["money"], text: SECRET_TASK, raw: `- [ ] ${SECRET_TASK}`, lineHash: "hash",
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

    it("marks a sensitive file row with a lock", async () => {
      renderPalette([[atom_fileMetadata, privateNotes]]);
      await search("md");
      const row = screen.getByRole("option", { name: /Payroll\.md/ });
      expect(row).toHaveAccessibleName(/\(sensitive\)/);
      expect(within(row).getByLabelText("Sensitive note")).toBeInTheDocument();
      expect(within(screen.getByRole("option", { name: /Planning\.md/ })).queryByLabelText("Sensitive note")).toBeNull();
    });

    it("leaves sensitive files out of search, #tag, recent and pinned rows in hidden mode", async () => {
      renderPalette([
        [atom_fileMetadata, privateNotes],
        [atom_privacyLevel, "hidden"],
        [atom_palettePinnedItems, [{ kind: "file", id: "Payroll.md" }]],
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
      const row = screen.getByRole("option", { name: /Sensitive task/ });
      expect(row).toHaveTextContent(MASKED_TEXT);
      expect(row).toHaveTextContent("Payroll.md:5");
      expect(document.body.textContent).not.toContain(SECRET_TASK);
    });

    it("never matches a masked task by its text", async () => {
      renderPalette([[atom_fileMetadata, privateNotes]]);
      await search("!secret");
      expect(screen.queryByRole("option", { name: /Sensitive task/ })).not.toBeInTheDocument();
      expect(screen.getByText("No matches found")).toBeInTheDocument();
    });
  });
});
