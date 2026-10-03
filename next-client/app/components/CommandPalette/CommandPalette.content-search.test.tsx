import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";
import { CommandPaletteProvider } from "./CommandPaletteContext";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { atom_pendingScrollTarget, atom_showHiddenFiles } from "@/app/atoms/ui-atoms";

const openFile = vi.fn();
const push = vi.fn();
const search = vi.hoisted(() => ({
  available: true,
  searchNoteContent: vi.fn(),
}));

vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ openFile }) }));
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => false }));
vi.mock("next/navigation", () => ({ usePathname: () => "/editor", useRouter: () => ({ push }) }));
vi.mock("@/app/services/content-search-client", () => ({
  isContentSearchAvailable: () => search.available,
  searchNoteContent: search.searchNoteContent,
  removeNoteContent: vi.fn(),
}));

const note = (path: string, frontmatter: Record<string, string> = {}) => ({
  path, name: path.split("/").pop(), handle: { kind: "file", name: path.split("/").pop() },
  tags: [], links: [], frontmatter, modifiedAt: 1, wordCount: 1, tasks: [],
});

const notes = {
  "projects/Plan.md": note("projects/Plan.md"),
  "Payroll.md": note("Payroll.md", { sensitive: "true" }),
  "_templates/Template.md": note("_templates/Template.md"),
};

const planHit = { path: "projects/Plan.md", name: "Plan.md", line: 3, column: 6, snippet: "Write needle tests", highlights: [6, 7, 8, 9, 10, 11], score: 130 };

let scrollTarget: unknown = undefined;
function ScrollTargetProbe() {
  scrollTarget = useAtomValue(atom_pendingScrollTarget);
  return null;
}

function Hydrate({ values, children }: { values: any[]; children: React.ReactNode }) {
  useHydrateAtoms(values);
  return children;
}

function renderPalette(values: any[] = []) {
  return render(
    <Provider>
      <Hydrate values={[[atom_fileMetadata, notes], ...values]}>
        <CommandPaletteProvider>
          <CommandPalette />
          <ScrollTargetProbe />
        </CommandPaletteProvider>
      </Hydrate>
    </Provider>,
  );
}

async function type(value: string) {
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = await screen.findByRole("combobox");
  fireEvent.change(input, { target: { value } });
  return input;
}

describe("CommandPalette / note text scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    search.available = true;
    scrollTarget = undefined;
    search.searchNoteContent.mockResolvedValue({ hits: [planHit], pending: 0, capped: false });
  });

  it("switches to the scope and searches non-sensitive, listed notes", async () => {
    renderPalette();
    const input = await type("/needle tests");
    expect(input).toHaveValue("/needle tests");

    await waitFor(() => expect(search.searchNoteContent).toHaveBeenCalledWith("needle tests", ["projects/Plan.md"]));
  });

  it("leaves sensitive notes out in hidden mode and lists _ paths when hidden files are shown", async () => {
    renderPalette([[atom_privacyLevel, "hidden"], [atom_showHiddenFiles, true]]);
    await type("/needle");
    await waitFor(() => expect(search.searchNoteContent).toHaveBeenCalled());
    expect(search.searchNoteContent.mock.calls[0][1].sort()).toEqual(["_templates/Template.md", "projects/Plan.md"]);
  });

  it("shows the highlighted snippet with name:line and the folder", async () => {
    renderPalette();
    await type("/needle");

    const row = await screen.findByRole("option", { name: /Write needle tests/ });
    expect(row).toHaveAccessibleName("Write needle tests Plan.md:3 projects");
    expect(row).toHaveTextContent("Plan.md:3");
    const highlighted = Array.from(row.querySelectorAll("strong.text-accent")).map((node) => node.textContent).join("");
    expect(highlighted).toBe("needle");
  });

  it("opens the note at the match when a row is chosen with Enter", async () => {
    renderPalette();
    const input = await type("/needle");
    await screen.findByRole("option", { name: /Write needle tests/ });

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(openFile).toHaveBeenCalledWith(notes["projects/Plan.md"].handle, "projects/Plan.md"));
    await waitFor(() => expect(scrollTarget).toEqual({ path: "projects/Plan.md", line: 3, column: 6 }));
    expect(push).not.toHaveBeenCalled();
  });

  it("asks for 2 characters and doesn't search shorter queries", async () => {
    renderPalette();
    await type("/a");
    expect(screen.getByText("Type at least 2 characters to search note text.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(search.searchNoteContent).not.toHaveBeenCalled();
    expect(screen.queryByText("No matches found")).not.toBeInTheDocument();
  });

  it("shows indexing progress while notes are still being indexed", async () => {
    search.searchNoteContent.mockResolvedValue({ hits: [], pending: 3, capped: false });
    renderPalette();
    await type("/needle");
    expect(await screen.findByText("Indexing note text… 3 notes left")).toBeInTheDocument();
  });

  it("explains when the size cap was reached", async () => {
    search.searchNoteContent.mockResolvedValue({ hits: [], pending: 1, capped: true });
    renderPalette();
    await type("/needle");
    expect(await screen.findByText("Note text search covers part of this vault (size limit reached).")).toBeInTheDocument();
  });

  it("says when note text search isn't available", async () => {
    search.available = false;
    renderPalette();
    await type("/needle");
    expect(screen.getByText("Note text search isn't available in this browser.")).toBeInTheDocument();
    expect(search.searchNoteContent).not.toHaveBeenCalled();
  });

  it("keeps the previous rows when a newer search is superseded", async () => {
    renderPalette();
    const input = await type("/needle");
    await screen.findByRole("option", { name: /Write needle tests/ });

    search.searchNoteContent.mockResolvedValue(null);
    fireEvent.change(input, { target: { value: "/needle t" } });
    await waitFor(() => expect(search.searchNoteContent).toHaveBeenCalledWith("needle t", ["projects/Plan.md"]));

    expect(screen.getByRole("option", { name: /Write needle tests/ })).toBeInTheDocument();
    expect(screen.queryByText("No matches found")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", async () => {
    search.searchNoteContent.mockResolvedValue({ hits: [], pending: 0, capped: false });
    renderPalette();
    await type("/nothing");
    expect(await screen.findByText("No matches found")).toBeInTheDocument();
  });
});
