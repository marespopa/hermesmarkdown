import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";
import { CommandPaletteProvider } from "./CommandPaletteContext";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { atom_pendingScrollTarget, atom_searchCodeFiles, atom_searchRegex, atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { atom_vaultTextFiles } from "@/app/atoms/vault-atoms";

const openFile = vi.fn();
const push = vi.fn();
const search = vi.hoisted(() => ({
  available: true,
  searchNoteContent: vi.fn(),
  grepTextFiles: vi.fn(),
}));

vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ openFile }) }));
vi.mock("@/app/hooks/use-mobile-chrome", () => ({ default: () => false }));
vi.mock("next/navigation", () => ({ usePathname: () => "/editor", useRouter: () => ({ push }) }));
vi.mock("@/app/services/content-search-client", () => ({
  isContentSearchAvailable: () => search.available,
  searchNoteContent: search.searchNoteContent,
  removeNoteContent: vi.fn(),
  DEFAULT_SEARCH_LIMIT: 50,
}));
vi.mock("@/app/services/text-grep-client", () => ({ grepTextFiles: search.grepTextFiles }));

const note = (path: string, frontmatter: Record<string, string> = {}) => ({
  path, name: path.split("/").pop(), handle: { kind: "file", name: path.split("/").pop() },
  tags: [], links: [], frontmatter, modifiedAt: 1, wordCount: 1, tasks: [],
});

const notes = {
  "projects/Plan.md": note("projects/Plan.md"),
  "Payroll.md": note("Payroll.md", { private: "true" }),
  "_templates/Template.md": note("_templates/Template.md"),
};

const planHit = { path: "projects/Plan.md", name: "Plan.md", line: 3, column: 6, snippet: "Write needle tests", highlights: [6, 7, 8, 9, 10, 11], score: 130 };

let scrollTarget: unknown = undefined;
function ScrollTargetProbe() {
  const value = useAtomValue(atom_pendingScrollTarget);
  React.useEffect(() => {
    scrollTarget = value;
  }, [value]);
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

  it("switches to the scope and searches public, listed notes", async () => {
    renderPalette();
    const input = await type("/needle tests");
    expect(input).toHaveValue("/needle tests");

    await waitFor(() => expect(search.searchNoteContent).toHaveBeenCalledWith("needle tests", ["projects/Plan.md"]));
  });

  it("leaves private notes out in hidden mode and lists _ paths when hidden files are shown", async () => {
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
    const highlighted = Array.from(row.querySelectorAll("strong.font-bold")).map((node) => node.textContent).join("");
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
    expect(screen.getByText("Type at least 2 characters to search file text.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(search.searchNoteContent).not.toHaveBeenCalled();
    expect(screen.queryByText("No matches found")).not.toBeInTheDocument();
  });

  it("shows indexing progress while notes are still being indexed", async () => {
    search.searchNoteContent.mockResolvedValue({ hits: [], pending: 3, capped: false });
    renderPalette();
    await type("/needle");
    expect(await screen.findByText("Indexing file text… 3 files left")).toBeInTheDocument();
  });

  it("explains when the size cap was reached", async () => {
    search.searchNoteContent.mockResolvedValue({ hits: [], pending: 1, capped: true });
    renderPalette();
    await type("/needle");
    expect(await screen.findByText("Text search covers part of this vault (size limit reached).")).toBeInTheDocument();
  });

  it("says when note text search isn't available", async () => {
    search.available = false;
    renderPalette();
    await type("/needle");
    expect(screen.getByText("Text search isn't available in this browser.")).toBeInTheDocument();
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

  describe("code files", () => {
    const apiHandle = { kind: "file", name: "api.ts" };
    const codeFiles = [[atom_vaultTextFiles, [{ path: "src/api.ts", handle: apiHandle }]]];
    const apiHit = { path: "src/api.ts", name: "api.ts", line: 2, column: 0, snippet: "needle()", highlights: [0, 1, 2, 3, 4, 5], score: 100 };

    it("lists them in the quick switcher by name and opens them", async () => {
      renderPalette(codeFiles);
      const input = await type("api");
      await screen.findByRole("option", { name: /api\.ts/ });
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(openFile).toHaveBeenCalledWith(apiHandle, "src/api.ts"));
    });

    it("leaves them to Search Code Files, off by default", async () => {
      renderPalette(codeFiles);
      await type("/needle");
      await waitFor(() => expect(search.searchNoteContent).toHaveBeenCalledWith("needle", ["projects/Plan.md"]));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(search.grepTextFiles).not.toHaveBeenCalled();
    });

    it("greps them when it's on, listing their rows after the notes' and showing progress", async () => {
      let report: (progress: unknown) => void = () => {};
      search.grepTextFiles.mockImplementation((_query, _files, _limit, onProgress) => {
        report = onProgress;
        return () => {};
      });
      renderPalette([...codeFiles, [atom_searchCodeFiles, true]]);
      await type("/needle");

      await waitFor(() => expect(search.grepTextFiles).toHaveBeenCalledWith("needle", [{ path: "src/api.ts", name: "api.ts", handle: apiHandle }], 50, expect.any(Function), "text"));
      expect(await screen.findByText("Searching files… 0 of 1")).toBeInTheDocument();

      React.act(() => report({ hits: [apiHit], scanned: 1, total: 1, done: true }));
      const options = await screen.findAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining("Plan.md:3"), expect.stringContaining("api.ts:2")]);
      expect(screen.queryByText(/Searching files/)).not.toBeInTheDocument();
    });
  });

  describe("with Regex on", () => {
    let report: (progress: unknown) => void = () => {};
    beforeEach(() => {
      search.grepTextFiles.mockImplementation((_query, _files, _limit, onProgress) => {
        report = onProgress;
        return () => {};
      });
    });

    it("greps the notes as a pattern instead of asking the note-text index", async () => {
      renderPalette([[atom_searchRegex, true]]);
      await type("/ne+dle");
      await waitFor(() => expect(search.grepTextFiles).toHaveBeenCalledWith(
        "ne+dle",
        expect.arrayContaining([expect.objectContaining({ path: "projects/Plan.md", isNote: true })]),
        50, expect.any(Function), "regex",
      ));
      // Private notes never match.
      expect(search.grepTextFiles.mock.calls[0][1].map((file: { path: string }) => file.path)).not.toContain("Payroll.md");
      expect(search.searchNoteContent).not.toHaveBeenCalled();

      React.act(() => report({ hits: [planHit], scanned: 3, total: 3, done: true }));
      expect(await screen.findByRole("option", { name: /Plan\.md/ })).toBeInTheDocument();
    });

    it("says when the pattern is invalid or was stopped for running too long", async () => {
      renderPalette([[atom_searchRegex, true]]);
      await type("/(ab");
      await waitFor(() => expect(search.grepTextFiles).toHaveBeenCalled());
      React.act(() => report({ hits: [], scanned: 0, total: 2, done: true, invalid: true }));
      expect(await screen.findByText("Not a valid regular expression yet.")).toBeInTheDocument();

      React.act(() => report({ hits: [], scanned: 1, total: 2, done: true, stalled: true }));
      expect(await screen.findByText("Search stopped: this pattern takes too long. Try a simpler one.")).toBeInTheDocument();
    });

    it("toggles from the Regex chip and Alt+R, only in the text scope", async () => {
      renderPalette();
      const input = await type("/needle");
      const chip = await screen.findByRole("button", { name: "Regex" });
      expect(chip).toHaveAttribute("aria-pressed", "false");
      fireEvent.keyDown(input, { key: "®", code: "KeyR", altKey: true });
      expect(chip).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(chip);
      expect(chip).toHaveAttribute("aria-pressed", "false");

      fireEvent.change(input, { target: { value: "needle" } });
      expect(screen.queryByRole("button", { name: "Regex" })).not.toBeInTheDocument();
    });
  });

  describe("Replace… chip", () => {
    it("opens Replace in Files with the query", async () => {
      renderPalette();
      await type("/needle");
      fireEvent.click(await screen.findByRole("button", { name: "Replace in files" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/editor/replace?find=needle"));
    });

    it("passes Regex along when it is on", async () => {
      renderPalette([[atom_searchRegex, true]]);
      await type("/ne+dle");
      fireEvent.click(await screen.findByRole("button", { name: "Replace in files" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/editor/replace?find=ne%2Bdle&regex=1"));
    });

    it("is absent with an empty query and outside the scope", async () => {
      renderPalette();
      const input = await type("/");
      expect(screen.queryByRole("button", { name: "Replace in files" })).not.toBeInTheDocument();
      fireEvent.change(input, { target: { value: "needle" } });
      expect(screen.queryByRole("button", { name: "Replace in files" })).not.toBeInTheDocument();
    });
  });
});
