import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { atom_gitChangesCache, atom_isVaultPending, atom_pendingScrollTarget, atom_vaultDescriptor } from "@/app/atoms/atoms";
import type { ChangedFile, ChangesResult } from "@/app/services/git/git-changes-types";
import ChangesPage from "./page";

const push = vi.fn();
const fileSystem = vi.hoisted(() => ({ vaultHandle: null as unknown, openFile: vi.fn(async () => {}) }));
const scan = vi.hoisted(() => ({ next: null as unknown, pending: false, found: [] as unknown[], start: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/editor/changes" }));
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => fileSystem }));
vi.mock("@/app/atoms/vault-atoms", async (original) => ({
  ...(await original<object>()),
  resolveFileHandleAtPath: vi.fn(async () => ({ name: "handle" })),
}));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/services/git-changes-client", () => ({
  startChangesScan: (...args: unknown[]) => {
    scan.start(...args);
    if (scan.found.length) (args[2] as (files: unknown[]) => void)(scan.found);
    return { result: scan.pending ? new Promise(() => {}) : Promise.resolve(scan.next), cancel: vi.fn() };
  },
}));

const lines = Array.from({ length: 30 }, (_, i) => "line " + (i + 1));
const modified: ChangedFile = {
  path: "notes/a.md",
  status: "modified",
  added: 1,
  removed: 1,
  diff: { kind: "text", lines, changes: [{ oldStart: 15, removed: ["old fifteen"], newStart: 15, newCount: 1 }] },
};
const deleted: ChangedFile = {
  path: "gone.md",
  status: "deleted",
  added: 0,
  removed: 1,
  diff: { kind: "text", lines: [], changes: [{ oldStart: 1, removed: ["bye"], newStart: 1, newCount: 0 }] },
};
const binary: ChangedFile = { path: "pic.md", status: "added", added: null, removed: null, diff: { kind: "binary" } };
const ok = (...files: ChangedFile[]): ChangesResult => ({ status: "ok", commit: "abcdef1234567", files });

function renderPage(kind: "local" | "browser" = "local", pending = false, seed?: (store: ReturnType<typeof createStore>) => void) {
  const store = createStore();
  seed?.(store);
  store.set(atom_isVaultPending, pending);
  store.set(atom_vaultDescriptor, (kind === "local" ? { kind: "local", name: "v" } : { kind: "browser", id: "1", name: "v" }) as never);
  render(
    <Provider store={store}>
      <ChangesPage />
    </Provider>,
  );
  return store;
}

describe("ChangesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scan.pending = false;
    scan.found = [];
    fileSystem.vaultHandle = { name: "vault" };
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(cleanup);

  it("asks for a vault", () => {
    fileSystem.vaultHandle = null;
    renderPage();
    expect(screen.getByText("Open a vault to see its changes.")).toBeInTheDocument();
    expect(scan.start).not.toHaveBeenCalled();
  });

  it("says there is no repository for a browser vault without scanning", () => {
    renderPage("browser");
    expect(screen.getByText(/This vault is stored in the browser/)).toBeInTheDocument();
    expect(scan.start).not.toHaveBeenCalled();
  });

  it("shows the page's skeleton while the scan runs", () => {
    scan.pending = true;
    renderPage();
    expect(screen.getByTestId("changes-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Reading the repository…");
  });

  it("shows the files found so far while the scan runs", async () => {
    scan.pending = true;
    scan.found = [modified];
    renderPage();
    expect(await screen.findByText("1 file changed")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Reading the repository…");
    expect(screen.queryByTestId("changes-skeleton")).toBeNull();
  });

  it("says the list is up to date once the scan is done", async () => {
    scan.next = ok(modified);
    renderPage();
    await screen.findByText("1 file changed");
    expect(screen.getByRole("status")).toHaveTextContent("Up to date");
  });

  it("shows the saved result at once and says it's checking while a rescan runs", async () => {
    scan.pending = true;
    renderPage("local", false, (store) => store.set(atom_gitChangesCache, { vault: fileSystem.vaultHandle as FileSystemDirectoryHandle, result: ok(modified, deleted) }));
    expect(screen.getByText("2 files changed")).toBeInTheDocument();
    // A quick rescan doesn't flicker: the check stays for the first moment.
    expect(screen.getByRole("status")).toHaveTextContent("Up to date");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Reading the repository…"));
    expect(screen.queryByTestId("changes-skeleton")).toBeNull();
  });

  it("waits for access to a restored vault before scanning", async () => {
    scan.next = ok();
    const store = renderPage("local", true);
    expect(screen.getByText(/Allow access to the vault/)).toBeInTheDocument();
    expect(scan.start).not.toHaveBeenCalled();
    act(() => store.set(atom_isVaultPending, false));
    expect(await screen.findByText(/No changes since the last commit/)).toBeInTheDocument();
    expect(scan.start).toHaveBeenCalledTimes(1);
  });

  it("says there is no repository when the vault has no .git", async () => {
    scan.next = { status: "no-repo" };
    renderPage();
    expect(await screen.findByText(/at the root of/)).toHaveTextContent("No .git folder at the root of vault.");
  });

  it("says nothing changed, with the short commit", async () => {
    scan.next = ok();
    renderPage();
    expect(await screen.findByText(/No changes since the last commit\. abcdef1/)).toBeInTheDocument();
  });

  it("offers Try Again after a read error", async () => {
    scan.next = { status: "error", detail: "NotFound: git: not found: abc" };
    renderPage();
    expect(await screen.findByText("NotFound: git: not found: abc")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));
    expect(scan.start).toHaveBeenCalledTimes(2);
  });

  it("summarises the files and line counts", async () => {
    scan.next = ok(modified, deleted);
    renderPage();
    expect(await screen.findByText("2 files changed")).toBeInTheDocument();
    const summary = screen.getByRole("list", { name: "Changed files" });
    expect(within(summary).getByText("notes/a.md")).toBeInTheDocument();
    expect(screen.getByText("abcdef1")).toBeInTheDocument();
  });

  it("expands a collapsed section from the file list", async () => {
    scan.next = ok(modified);
    renderPage();
    await screen.findByText("1 file changed");
    fireEvent.click(screen.getByRole("button", { name: "Collapse All" }));
    expect(screen.getByRole("button", { name: "Expand notes/a.md" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(within(screen.getByRole("list", { name: "Changed files" })).getByRole("button"));
    expect(screen.getByRole("button", { name: "Collapse notes/a.md" })).toHaveAttribute("aria-expanded", "true");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("opens the file at its first change from Open file", async () => {
    scan.next = ok(modified);
    const store = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Open notes/a.md" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(fileSystem.openFile).toHaveBeenCalled();
    expect(store.get(atom_pendingScrollTarget)).toEqual({ path: "notes/a.md", line: 15 });
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/editor?"));
  });

  it("stays on the page when the path or a diff line is clicked", async () => {
    scan.next = ok(modified);
    renderPage();
    const section = (await screen.findByText("old fifteen")).closest("section")!;
    fireEvent.click(within(section).getByText("notes/a.md"));
    fireEvent.click(within(section).getByText("old fifteen"));
    expect(push).not.toHaveBeenCalled();
    expect(fileSystem.openFile).not.toHaveBeenCalled();
  });

  it("gives a deleted file no Open file button", async () => {
    scan.next = ok(deleted);
    renderPage();
    await screen.findByText("1 file changed");
    const section = screen.getByText("Deleted").closest("section")!;
    expect(within(section).queryByRole("button", { name: "Open gone.md" })).toBeNull();
  });

  it("reveals the lines of a folded stretch", async () => {
    scan.next = ok(modified);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Show 11 unchanged lines" }));
    expect(screen.getByText("line 3")).toBeInTheDocument();
  });

  it("shows a message for a binary file", async () => {
    scan.next = ok(binary);
    renderPage();
    expect(await screen.findByText("Binary file")).toBeInTheDocument();
  });
});
