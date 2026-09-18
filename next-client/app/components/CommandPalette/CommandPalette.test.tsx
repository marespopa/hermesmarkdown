import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";
import { CommandPaletteProvider, useRegisterCommand } from "./CommandPaletteContext";
import { atom_fileMetadata, atom_customWorkspaces } from "@/app/atoms/metadata";
import { atom_activeEditorView, atom_railPanel, atom_selectedFileTags } from "@/app/atoms/ui-atoms";

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
    action: vi.fn(),
  });
  return null;
}

function Hydrate({ values, children }: { values: any[]; children: React.ReactNode }) {
  useHydrateAtoms(values);
  return children;
}

function TagSelectionObserver() {
  const selectedTags = useAtomValue(atom_selectedFileTags);
  const railPanel = useAtomValue(atom_railPanel);
  return <output data-testid="tag-selection">{railPanel}:{selectedTags.join(",")}</output>;
}

function renderPalette(values: any[] = []) {
  return render(
    <Provider>
      <Hydrate values={values}>
        <CommandPaletteProvider>
          <TestCommand />
          <CommandPalette />
          <TagSelectionObserver />
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

  it("keeps commands out of the default file search and shows them after >", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });

    const input = await screen.findByRole("combobox");
    expect(screen.queryByText("Test command")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: ">test" } });

    await waitFor(() => expect(screen.getByRole("listbox")).toHaveTextContent("Test command"));
  });

  it("opens command mode from Ctrl/Cmd+Shift+P", async () => {
    renderPalette();
    fireEvent.keyDown(document, { key: "p", ctrlKey: true, shiftKey: true });

    expect(await screen.findByRole("combobox")).toHaveValue(">");
    expect(screen.getByRole("listbox")).toHaveTextContent("Test command");
  });

  it("searches the vault-wide tag catalog with #", async () => {
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
      }],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "#plan" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("#planning");
    expect(screen.getByRole("listbox")).toHaveTextContent("1 note");
    expect(screen.getByRole("listbox")).not.toHaveTextContent("Roadmap.md");

  });

  it("opens file search with the chosen vault tag", async () => {
    renderPalette([
      [atom_fileMetadata, {
        "Roadmap.md": {
          path: "Roadmap.md",
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

    fireEvent.change(input, { target: { value: "#plan" } });
    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(screen.getByTestId("tag-selection")).toHaveTextContent("search:planning");
  });

  it("searches tasks with ! and smart views with %", async () => {
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
      [atom_customWorkspaces, [{
        id: "planning",
        name: "Planning",
        icon: "folder",
        query: { operator: "AND", rules: [] },
      }]],
    ]);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = await screen.findByRole("combobox");

    fireEvent.change(input, { target: { value: "!ship" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Ship command palette");
    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(push).toHaveBeenCalledWith("/editor/tasks");
    expect(openFile).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const reopenedInput = await screen.findByRole("combobox");
    fireEvent.change(reopenedInput, { target: { value: "%plan" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Planning");
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

    fireEvent.change(input, { target: { value: ":deploy" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Deployment Guide");
    fireEvent.click(screen.getAllByRole("option")[0]);

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      selection: { anchor: 20 },
      effects: expect.anything(),
    }));
    expect(focus).toHaveBeenCalled();
  });
});
