import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { atom_isVaultPending } from "@/app/atoms/atoms";
import { atom_lastReplace, atom_replacePrefs } from "@/app/atoms/replace-atoms";
import type { ReplaceMatch } from "@/app/workers/replace-search";
import type { GrepFile, ReplaceFileResult } from "@/app/workers/text-grep-protocol";
import type { ReplaceScanProgress } from "@/app/services/replace-client";
import ReplacePage from "./page";

const vault = { name: "vault" } as unknown as FileSystemDirectoryHandle;
const system = vi.hoisted(() => ({ vault: null as unknown }));
const scan = vi.hoisted(() => ({
  calls: [] as { query: Record<string, unknown>; files: unknown[]; onProgress: (progress: unknown) => void }[],
  available: true,
}));
const apply = vi.hoisted(() => vi.fn());
const undo = vi.hoisted(() => vi.fn(async () => {}));
const replaceFiles = vi.hoisted(() => ({ files: [] as unknown[], hasPrivate: false }));
const openAt = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/editor/replace" }));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ vaultHandle: system.vault }) }));
vi.mock("@/app/services/replace-client", () => ({
  isReplaceAvailable: () => scan.available,
  disposeReplaceWorker: vi.fn(),
  scanForReplace: (query: Record<string, unknown>, files: unknown[], onProgress: (progress: unknown) => void) => {
    scan.calls.push({ query, files, onProgress });
    return vi.fn();
  },
}));
vi.mock("./use-replace-files", () => ({ useReplaceFiles: () => replaceFiles }));
vi.mock("./use-apply-replace", () => ({ useApplyReplace: () => ({ apply, undo }) }));
vi.mock("../changes/use-open-change", () => ({ useOpenChange: () => openAt }));

const grepFile = (path: string): GrepFile => ({ path, name: path.split("/").pop()!, isNote: true });
const match = (ordinal: number, line: number, text: string, extra: Partial<ReplaceMatch> = {}): ReplaceMatch => ({
  ordinal, from: ordinal * 10, to: ordinal * 10 + text.length, line, column: 2, before: "say ", text, after: " now", full: text, ...extra,
});
const results = (): ReplaceFileResult[] => [
  { path: "notes/a.md", fingerprint: "1:a", matches: [match(0, 1, "foo"), match(1, 4, "foo")] },
  { path: "b.md", fingerprint: "1:b", matches: [match(0, 2, "foo")] },
];

function renderPage(setup?: (store: ReturnType<typeof createStore>) => void) {
  const store = createStore();
  store.set(atom_isVaultPending, false);
  setup?.(store);
  render(
    <Provider store={store}>
      <ReplacePage />
    </Provider>,
  );
  return store;
}

const typeFind = (value: string) => fireEvent.change(screen.getByLabelText("Find"), { target: { value } });
const lastScan = () => scan.calls[scan.calls.length - 1];
const debounce = () => act(() => void vi.advanceTimersByTime(300));
const answer = (progress: Partial<ReplaceScanProgress> = {}) =>
  act(() => lastScan().onProgress({ files: results(), scanned: 2, total: 2, matchCount: 3, done: true, ...progress }));
const replaceButton = () => screen.getByRole("button", { name: /^Replac/ });

describe("ReplacePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    scan.calls = [];
    scan.available = true;
    system.vault = vault;
    replaceFiles.files = [grepFile("notes/a.md"), grepFile("b.md")];
    replaceFiles.hasPrivate = false;
    apply.mockReset();
    undo.mockClear();
    openAt.mockClear();
    window.history.replaceState(null, "", "/editor/replace");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("explains each state instead of showing the form", () => {
    system.vault = null;
    renderPage();
    expect(screen.getByText("Open a vault to replace text in its files.")).toBeInTheDocument();
    cleanup();

    system.vault = vault;
    renderPage((store) => store.set(atom_isVaultPending, true));
    expect(screen.getByText("Allow access to the vault's folder to replace text in it.")).toBeInTheDocument();
    cleanup();

    scan.available = false;
    renderPage();
    expect(screen.getByText("Replace in Files isn't available in this browser.")).toBeInTheDocument();
    cleanup();

    scan.available = true;
    replaceFiles.files = [];
    renderPage();
    expect(screen.getByText("No files to search.")).toBeInTheDocument();
  });

  it("hints at what to do and doesn't scan with an empty Find", () => {
    renderPage();
    debounce();
    expect(screen.getByText("Type what to find.")).toBeInTheDocument();
    expect(scan.calls).toHaveLength(0);
    expect(replaceButton()).toBeDisabled();
  });

  it("scans after the debounce with the stored options", () => {
    renderPage((store) => store.set(atom_replacePrefs, { matchCase: true, wholeWord: false, regex: true, includeCode: false }));
    typeFind("fo+");
    expect(scan.calls).toHaveLength(0);
    debounce();
    expect(scan.calls).toHaveLength(1);
    expect(lastScan().query).toEqual({ find: "fo+", matchCase: true, wholeWord: false, regex: true });
  });

  it("previews files and matches with the struck text and the replacement", () => {
    renderPage();
    typeFind("foo");
    fireEvent.change(screen.getByLabelText("Replace with"), { target: { value: "bar" } });
    debounce();
    answer();
    expect(screen.getByText("3 matches in 2 files")).toBeInTheDocument();
    const section = screen.getByText("a.md").closest("section")!;
    expect(within(section).getAllByText("foo")).toHaveLength(2);
    expect(within(section).getAllByText("bar")).toHaveLength(2);
    expect(screen.getByText("notes")).toBeInTheDocument();
    expect(replaceButton()).toHaveTextContent("Replace 3 matches in 2 files");
  });

  it("updates rows when typing in Replace with, without a new scan", () => {
    renderPage();
    typeFind("foo");
    debounce();
    answer();
    expect(scan.calls).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Replace with"), { target: { value: "qux" } });
    debounce();
    expect(screen.getAllByText("qux")).toHaveLength(3);
    expect(scan.calls).toHaveLength(1);
  });

  it("shows No matches when the scan finds nothing", () => {
    renderPage();
    typeFind("zzz");
    debounce();
    answer({ files: [], matchCount: 0 });
    expect(screen.getByText("No matches.")).toBeInTheDocument();
    expect(replaceButton()).toBeDisabled();
  });

  it("updates the button count when a match or a file is unchecked", () => {
    renderPage();
    typeFind("foo");
    debounce();
    answer();
    // Rows follow the sorted files: b.md, then notes/a.md's two matches.
    fireEvent.click(screen.getAllByLabelText(/^Replace match on line/)[1]);
    expect(replaceButton()).toHaveTextContent("Replace 2 matches in 2 files");
    fireEvent.click(screen.getByLabelText("Replace in b.md"));
    expect(replaceButton()).toHaveTextContent("Replace 1 match in 1 file");
    fireEvent.click(screen.getByLabelText("Replace in notes/a.md"));
    expect(replaceButton()).toBeDisabled();
  });

  it("disables Replace while scanning, when capped, invalid or stalled", () => {
    renderPage();
    typeFind("foo");
    debounce();
    answer({ done: false, scanned: 1 });
    expect(replaceButton()).toBeDisabled();
    answer({ capped: true });
    expect(screen.getByText("More than 5,000 matches. Narrow the search to replace.")).toBeInTheDocument();
    expect(replaceButton()).toBeDisabled();
    answer({ files: [], matchCount: 0, invalid: true });
    expect(screen.getByText("Not a valid regular expression yet.")).toBeInTheDocument();
    answer({ stalled: true });
    expect(screen.getByText("Search stopped: this pattern takes too long. Try a simpler one.")).toBeInTheDocument();
    expect(replaceButton()).toBeDisabled();
    answer();
    expect(replaceButton()).toBeEnabled();
  });

  it("prefills Find and Regex from the URL", () => {
    window.history.replaceState(null, "", "/editor/replace?find=foo&regex=1");
    renderPage();
    expect(screen.getByLabelText("Find")).toHaveValue("foo");
    debounce();
    expect(lastScan().query).toMatchObject({ find: "foo", regex: true });
    expect(screen.getByRole("button", { name: "Regex" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps Find in the URL", () => {
    renderPage();
    typeFind("a b");
    expect(window.location.search).toBe("?find=a+b");
  });

  it("applies the included matches and shows Replacing… meanwhile", async () => {
    let finish!: (value: unknown) => void;
    apply.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderPage();
    typeFind("foo");
    debounce();
    answer();
    fireEvent.click(screen.getAllByLabelText(/^Replace match on line/)[2]);
    fireEvent.click(replaceButton());

    const [plan] = apply.mock.calls[0];
    expect(plan.files.map((file: { path: string; skip: Set<number> }) => [file.path, [...file.skip]])).toEqual([["b.md", []], ["notes/a.md", [1]]]);
    expect(plan.files[0].fingerprint).toBe("1:b");
    expect(screen.getByRole("button", { name: /Replacing… 0 of 2/ })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await act(async () => {
      finish({ matches: 2, files: 2, skipped: 0, failed: 0, results: { "b.md": "replaced", "notes/a.md": "replaced" } });
    });
    expect(screen.getAllByText("Replaced 1")).toHaveLength(2);
    debounce();
    expect(scan.calls).toHaveLength(2);
  });

  it("offers Undo in a banner after a replace", async () => {
    const last = { vault, matches: 4, files: [{ path: "a.md", before: "x", afterFingerprint: "1:a" }] };
    renderPage((store) => store.set(atom_lastReplace, last));
    expect(screen.getByText("Replaced 4 matches in 1 file")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    });
    expect(undo).toHaveBeenCalledWith(last);
  });

  it("ignores a replace made in another vault", () => {
    const other = { vault: { name: "other" } as unknown as FileSystemDirectoryHandle, matches: 4, files: [] };
    const store = renderPage((s) => s.set(atom_lastReplace, other));
    expect(screen.queryByText(/Replaced 4 matches/)).not.toBeInTheDocument();
    expect(store.get(atom_lastReplace)).toBeNull();
  });

  it("opens a file at the match's line and column", () => {
    renderPage();
    typeFind("foo");
    debounce();
    answer();
    fireEvent.click(screen.getByLabelText("Open notes/a.md at line 4"));
    expect(openAt).toHaveBeenCalledWith("notes/a.md", 4, 2);
  });

  it("notes that private notes are skipped", () => {
    replaceFiles.hasPrivate = true;
    renderPage();
    expect(screen.getByText("Private files are skipped.")).toBeInTheDocument();
  });
});
