import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Provider, createStore } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_recentVaults, atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_privacyLevel } from "@/app/atoms/privacy-atoms";
import { MASKED_PREVIEW, type PrivacyLevel } from "@/app/utils/note-display";
import { atom_homeFeedTopRequest, atom_indexerState, atom_userName, type IndexerState } from "@/app/atoms/ui-atoms";
import HomeFeed from "./HomeFeed";
import { INDEXING_VERBS, ROTATE_MS } from "./home-feed/FeedStatus";
import { extractTasks } from "@/app/utils/taskExtractor";
import { todayNoteName } from "@/app/utils/today-note";

const vault = vi.hoisted(() => ({ closeVault: vi.fn(), openVault: vi.fn(), confirm: vi.fn() }));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ openVault: vault.openVault, closeVault: vault.closeVault, isVaultSupported: true, isBrowserVaultSupported: true }),
}));
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => ({ confirm: vault.confirm }) }));
function meta(path: string, minutesAgo: number, preview = ""): FileMetadata {
  return {
    path,
    name: path.split("/").pop()!,
    tags: [],
    links: [],
    frontmatter: {},
    modifiedAt: Date.now() - minutesAgo * 60_000,
    wordCount: 0,
    tasks: [],
    preview,
    handle: null,
  };
}

const Hydrate = ({ metadata, userName = "", indexerState = "idle", children }: { metadata: Record<string, FileMetadata>; userName?: string; indexerState?: IndexerState; children: React.ReactNode }) => {
  useHydrateAtoms([[atom_fileMetadata, metadata], [atom_userName, userName], [atom_indexerState, indexerState]] as any);
  return children;
};

function renderFeed(metadata: Record<string, FileMetadata>, userName = "", indexerState: IndexerState = "idle") {
  const handlers = { onOpenNote: vi.fn(), onNewNote: vi.fn(), onSearch: vi.fn(), onClose: vi.fn() };
  render(
    <Provider>
      <Hydrate metadata={metadata} userName={userName} indexerState={indexerState}>
        <HomeFeed {...handlers} />
      </Hydrate>
    </Provider>,
  );
  return handlers;
}

const NOTES = {
  "old.md": meta("old.md", 30, "Older body"),
  "new.md": meta("new.md", 5, "Newest body"),
  ".hermes/skill.md": meta(".hermes/skill.md", 1),
};

describe("HomeFeed", () => {
  beforeEach(() => cleanup());

  it("lists vault notes newest first with previews, skipping hidden files", () => {
    renderFeed(NOTES);
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("new");
    expect(rows[0]).toHaveTextContent("Newest body");
    expect(rows[1]).toHaveTextContent("old");
  });

  it("opens a note on click", () => {
    const { onOpenNote } = renderFeed(NOTES);
    fireEvent.click(screen.getByRole("button", { name: "old" }));
    expect(onOpenNote).toHaveBeenCalledWith("old.md");
  });

  it("moves with j/k and arrows and opens the selection with Enter", () => {
    const { onOpenNote } = renderFeed(NOTES);
    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onOpenNote).toHaveBeenLastCalledWith("old.md");
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onOpenNote).toHaveBeenLastCalledWith("new.md");
  });

  it("focuses the note list on open, so the keys work without a click", () => {
    const { onOpenNote } = renderFeed(NOTES);
    const list = screen.getByRole("listbox", { name: "Recent notes" });
    expect(document.activeElement).toBe(list);
    fireEvent.keyDown(list, { key: "j" });
    fireEvent.keyDown(list, { key: "Enter" });
    expect(onOpenNote).toHaveBeenLastCalledWith("old.md");
  });

  it("jumps with gg and G and opens the selection with o", () => {
    const { onOpenNote, onSearch } = renderFeed(NOTES);
    fireEvent.keyDown(window, { key: "G" });
    fireEvent.keyDown(window, { key: "o" });
    expect(onOpenNote).toHaveBeenLastCalledWith("old.md");
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "o" });
    expect(onOpenNote).toHaveBeenLastCalledWith("new.md");
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("opens an empty search with /", () => {
    const { onSearch } = renderFeed(NOTES);
    fireEvent.keyDown(window, { key: "/" });
    expect(onSearch).toHaveBeenCalledWith();
  });

  it("pins the selected note with p and keeps it selected", () => {
    localStorage.clear();
    const store = createStore();
    store.set(atom_fileMetadata, NOTES);
    store.set(atom_vaultHandle, { name: "Vault" } as FileSystemDirectoryHandle);
    const onOpenNote = vi.fn();
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={onOpenNote} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );
    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "p" });
    const rows = screen.getAllByRole("option");
    expect(rows[0]).toHaveTextContent("old");
    expect(rows[0]).toHaveTextContent("Pinned");
    fireEvent.keyDown(window, { key: "o" });
    expect(onOpenNote).toHaveBeenLastCalledWith("old.md");
  });

  it("doesn't take focus from a text field", () => {
    const field = document.createElement("input");
    document.body.appendChild(field);
    field.focus();
    renderFeed(NOTES);
    expect(document.activeElement).toBe(field);
    field.remove();
  });

  it("opens the palette with a typed character and leaves on Escape", () => {
    const { onSearch, onClose } = renderFeed(NOTES);
    fireEvent.keyDown(window, { key: "w" });
    expect(onSearch).toHaveBeenCalledWith("w");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("ignores keys with modifiers so shortcuts keep working", () => {
    const { onSearch } = renderFeed(NOTES);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("offers the search pill and a new-note button", () => {
    const { onSearch, onNewNote } = renderFeed(NOTES);
    fireEvent.click(screen.getByRole("button", { name: /Search or create/ }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(onNewNote).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Search commands" }));
    expect(onSearch).toHaveBeenLastCalledWith(">");
  });

  it("shows notes before they're indexed, without a 1970 date", () => {
    renderFeed({ "draft idea.md": { ...meta("draft idea.md", 0), modifiedAt: 0, preview: undefined } });
    const [row] = screen.getAllByRole("option");
    expect(row).toHaveTextContent("draft idea");
    expect(row).not.toHaveTextContent("1970");
  });

  it("renders only a window of rows for a large vault", () => {
    const many: Record<string, FileMetadata> = {};
    for (let i = 0; i < 500; i++) many[`note-${i}.md`] = meta(`note-${i}.md`, i, `Body ${i}`);
    // jsdom has no layout: the virtualizer reads the scroll element's
    // offsetHeight (0) and would render no rows. Give it a viewport.
    const height = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(800);
    const width = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
    renderFeed(many);
    height.mockRestore();
    width.mockRestore();

    const rows = screen.getAllByRole("option");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(50);
    // Newest first, even when virtualized.
    expect(rows[0]).toHaveTextContent("note-0");
  });


  it("scrolls back to the top and the newest note when Home is pressed again", () => {
    const store = createStore();
    store.set(atom_fileMetadata, NOTES);
    store.set(atom_homeFeedTopRequest, 3);
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={vi.fn()} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );
    const feed = screen.getByTestId("home-feed");
    // Opening with an earlier request count doesn't scroll.
    feed.scrollTop = 400;
    fireEvent.keyDown(window, { key: "j" });
    expect(feed.scrollTop).toBe(400);

    act(() => store.set(atom_homeFeedTopRequest, 4));
    expect(feed.scrollTop).toBe(0);
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("offers vault actions and ways to start writing with no vault open", () => {
    const handlers = { onOpenNote: vi.fn(), onNewNote: vi.fn(), onSearch: vi.fn(), onClose: vi.fn(), onOpenFile: vi.fn() };
    render(
      <Provider>
        <HomeFeed {...handlers} hasVault={false} />
      </Provider>,
    );
    const start = screen.getByRole("region", { name: "Get started" });
    expect(within(start).getByText("Open a vault to see your notes here.")).toBeInTheDocument();
    expect(within(start).getByRole("button", { name: "Open Vault" })).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close vault" })).not.toBeInTheDocument();

    fireEvent.click(within(start).getByRole("button", { name: "New Note" }));
    expect(handlers.onNewNote).toHaveBeenCalled();
    fireEvent.click(within(start).getByRole("button", { name: "Open File…" }));
    expect(handlers.onOpenFile).toHaveBeenCalled();
    // No notes to search: the pill opens the command list.
    fireEvent.click(screen.getByRole("button", { name: /Search commands…/ }));
    expect(handlers.onSearch).toHaveBeenCalledWith(">");
  });

  it("names the open vault and closes it after a confirm", async () => {
    const store = createStore();
    store.set(atom_fileMetadata, NOTES);
    store.set(atom_vaultHandle, { name: "github-42-main" } as FileSystemDirectoryHandle);
    store.set(atom_vaultDescriptor, { kind: "github", displayName: "acme/notes" } as any);
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={vi.fn()} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );
    expect(screen.getByText("acme/notes")).toBeInTheDocument();
    expect(screen.getByText(/GitHub/)).toBeInTheDocument();

    // Close lives in the vault menu, not on the bar.
    expect(screen.queryByRole("button", { name: "Close vault" })).not.toBeInTheDocument();

    vault.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "acme/notes, vault menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close vault" }));
    await act(async () => {});
    expect(vault.closeVault).not.toHaveBeenCalled();

    vault.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "acme/notes, vault menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close vault" }));
    await act(async () => {});
    expect(vault.closeVault).toHaveBeenCalledTimes(1);
  });

  it("opens one vault menu from the name: up to 5 other recent vaults, vault actions, refresh and close", () => {
    const store = createStore();
    store.set(atom_fileMetadata, NOTES);
    store.set(atom_vaultHandle, { name: "work" } as FileSystemDirectoryHandle);
    const recent = (name: string) => ({ key: `local:${name}`, kind: "local" as const, name, handle: {} as FileSystemDirectoryHandle, openedAt: 0 });
    store.set(atom_recentVaults, ["work", "a", "b", "c", "d", "e", "f"].map(recent));
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={vi.fn()} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "work, vault menu" }));
    const menu = screen.getByRole("menu", { name: "Vault" });
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "a", "b", "c", "d", "e",
      "Open vault…",
      "Create vault…",
      "Browser vaults…",
      "Refresh vault",
      "Close vault",
    ]);

    fireEvent.click(within(menu).getByRole("menuitem", { name: "Open vault…" }));
    expect(vault.openVault).toHaveBeenCalledTimes(1);
  });

  it("lists recent vaults on the no-vault start screen", () => {
    const store = createStore();
    store.set(atom_recentVaults, [
      { key: "browser:abc", kind: "browser", name: "Ideas", descriptor: {} as any, openedAt: 1 },
    ]);
    render(
      <Provider store={store}>
        <HomeFeed hasVault={false} onOpenNote={vi.fn()} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );
    const list = screen.getByRole("region", { name: "Recent vaults" });
    expect(within(list).getByRole("button", { name: /^Ideas/ })).toHaveTextContent("Stored in this browser");

    fireEvent.click(within(list).getByRole("button", { name: "Remove Ideas from recent vaults" }));
    expect(screen.queryByRole("region", { name: "Recent vaults" })).not.toBeInTheDocument();
    expect(store.get(atom_recentVaults)).toEqual([]);
  });

  it("filters the feed by tag chips, narrowing with each tag", () => {
    const store = createStore();
    store.set(atom_fileMetadata, {
      "a.md": { ...meta("a.md", 1), tags: ["work", "plan"] },
      "b.md": { ...meta("b.md", 2), tags: ["work"] },
      "c.md": { ...meta("c.md", 3), tags: [] },
    });
    store.set(atom_vaultHandle, { name: "Vault" } as FileSystemDirectoryHandle);
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={vi.fn()} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );
    const chips = screen.getByRole("group", { name: "Filter by tag" });
    // Most used first.
    expect(within(chips).getAllByRole("button").map((b) => b.textContent)).toEqual(["#work", "#plan"]);

    fireEvent.click(within(chips).getByRole("button", { name: "#work, 2 notes" }));
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("a.md");
    expect(rows[1]).toHaveTextContent("b.md");
    expect(within(chips).getByRole("button", { name: "#work, 2 notes" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(chips).getByRole("button", { name: "#plan, 1 note" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);

    fireEvent.click(within(chips).getByRole("button", { name: "× Clear" }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("shows the most used tags and hides the rest behind +N", () => {
    const metadata: Record<string, FileMetadata> = {};
    for (let i = 0; i < 10; i++) metadata[`n${i}.md`] = { ...meta(`n${i}.md`, i + 1), tags: [`t${i}`] };
    renderFeed(metadata);
    const chips = screen.getByRole("group", { name: "Filter by tag" });
    expect(within(chips).getAllByRole("button", { name: /^#/ })).toHaveLength(8);
    fireEvent.click(within(chips).getByRole("button", { name: "+2" }));
    expect(within(chips).getAllByRole("button", { name: /^#/ })).toHaveLength(10);
    expect(within(chips).getByRole("button", { name: "Fewer" })).toHaveAttribute("aria-expanded", "true");
  });

  it("has no tag row when no note is tagged", () => {
    renderFeed(NOTES);
    expect(screen.queryByRole("group", { name: "Filter by tag" })).not.toBeInTheDocument();
  });

  it("pins a note to the top of the feed and unpins it", () => {
    localStorage.clear();
    const store = createStore();
    store.set(atom_fileMetadata, NOTES);
    store.set(atom_vaultHandle, { name: "Vault" } as FileSystemDirectoryHandle);
    const onOpenNote = vi.fn();
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={onOpenNote} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );

    fireEvent.click(within(screen.getAllByRole("option")[1]).getByRole("button", { name: "Pin to Home" }));
    let rows = screen.getAllByRole("option");
    expect(rows[0]).toHaveTextContent("Pinned");
    expect(rows[0]).toHaveTextContent("old");
    expect(rows[1]).toHaveTextContent("new");
    expect(onOpenNote).not.toHaveBeenCalled();

    fireEvent.click(within(rows[0]).getByRole("button", { name: "Unpin from Home" }));
    rows = screen.getAllByRole("option");
    expect(rows[0]).toHaveTextContent("new");
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
  });

  it("opens a row's menu on right-click, to open or pin the note", () => {
    localStorage.clear();
    const store = createStore();
    store.set(atom_fileMetadata, NOTES);
    store.set(atom_vaultHandle, { name: "Vault" } as FileSystemDirectoryHandle);
    const onOpenNote = vi.fn();
    const onClose = vi.fn();
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={onOpenNote} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={onClose} />
      </Provider>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "old" }), { clientX: 40, clientY: 80 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin to Home" }));
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Pinned");

    // The feed's keys wait while a menu is open: Escape closes only the menu.
    fireEvent.contextMenu(screen.getByRole("button", { name: "old" }), { clientX: 40, clientY: 80 });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByRole("button", { name: "old" }), { clientX: 40, clientY: 80 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    expect(onOpenNote).toHaveBeenCalledWith("old.md");
  });

  it("has no Explorer button in the search bar", () => {
    renderFeed(NOTES);
    expect(screen.queryByRole("button", { name: "Open Explorer" })).not.toBeInTheDocument();
  });


  it("greets the user for the time of day, by name when one is set", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 28, 9, 0));
    try {
      renderFeed(NOTES, "Ada");
      expect(screen.getByText("Good morning, Ada!")).toBeInTheDocument();
      cleanup();
      renderFeed(NOTES);
      expect(screen.getByText("Good morning!")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a quiet start prompt for an empty vault", () => {
    const { onNewNote } = renderFeed({});
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start writing" }));
    expect(onNewNote).toHaveBeenCalled();
  });

  it("shows three skeleton rows instead of the start prompt while the vault loads", () => {
    renderFeed({}, "", { status: "compiling", count: 0 });
    expect(screen.getByTestId("feed-skeleton").querySelectorAll("[data-skeleton-row]")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Start writing" })).not.toBeInTheDocument();
  });

  it("drops the skeleton once notes are listed", () => {
    renderFeed(NOTES, "", { status: "compiling", count: 0 });
    expect(screen.queryByTestId("feed-skeleton")).not.toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("rotates the indexing verb while the indexer runs", () => {
    vi.useFakeTimers();
    try {
      renderFeed(NOTES, "", "compiling");
      const status = screen.getByRole("status", { name: "Indexing notes" });
      const first = status.textContent;
      act(() => { vi.advanceTimersByTime(ROTATE_MS); });
      expect(status.textContent).not.toBe(first);
      expect(INDEXING_VERBS.some((verb) => status.textContent === `${verb} notes…`)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts the next indexing run on a new verb", () => {
    renderFeed(NOTES, "", "compiling");
    const first = screen.getByRole("status").textContent;
    cleanup();
    renderFeed(NOTES, "", "compiling");
    expect(screen.getByRole("status").textContent).not.toBe(first);
  });

  it("hides the indexing status when idle", () => {
    renderFeed(NOTES);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("HomeFeed privacy", () => {
  beforeEach(() => cleanup());

  const SECRET = "Revenue was 42,246RON";
  const PRIVATE_NOTES = {
    "plain.md": meta("plain.md", 10, "Plain body"),
    "secret.md": { ...meta("secret.md", 5, SECRET), frontmatter: { sensitive: "true" } },
  };

  function renderWithLevel(level: PrivacyLevel) {
    const store = createStore();
    store.set(atom_fileMetadata, PRIVATE_NOTES);
    store.set(atom_indexerState, "idle");
    store.set(atom_privacyLevel, level);
    render(
      <Provider store={store}>
        <HomeFeed onOpenNote={vi.fn()} onNewNote={vi.fn()} onSearch={vi.fn()} onClose={vi.fn()} />
      </Provider>,
    );
  }

  it("shows the title, a lock and masked bullets by default, never the real preview", () => {
    renderWithLevel("show_title");
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("secret");
    expect(screen.getByLabelText("Sensitive note")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent(MASKED_PREVIEW);
    expect(rows[0]).toHaveTextContent("Preview hidden");
    expect(document.body.textContent).not.toContain(SECRET);
    expect(rows[1]).toHaveTextContent("Plain body");
    expect(screen.getByRole("button", { name: "secret (sensitive)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "plain" })).toBeInTheDocument();
  });

  it("leaves sensitive notes out in hidden mode", () => {
    renderWithLevel("hidden");
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("plain");
    expect(screen.queryByLabelText("Sensitive note")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("secret");
  });

  it("renders the preview blurred, announced as blurred, in blurred mode", () => {
    renderWithLevel("blurred");
    const rows = screen.getAllByRole("option");
    expect(rows[0]).toHaveTextContent(SECRET);
    expect(rows[0]).toHaveTextContent("Preview blurred");
    expect(screen.getByText(SECRET)).toHaveAttribute("aria-hidden", "true");
  });
});

describe("HomeFeed worklog", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  function renderWorklog(metadata: Record<string, FileMetadata>) {
    const handlers = { onOpenNote: vi.fn(), onNewNote: vi.fn(), onSearch: vi.fn(), onClose: vi.fn(), onOpenToday: vi.fn(), onOpenTask: vi.fn() };
    render(
      <Provider>
        <Hydrate metadata={metadata}>
          <HomeFeed {...handlers} />
        </Hydrate>
      </Provider>,
    );
    return handlers;
  }

  const withTasks = (path: string, body: string) => ({ ...meta(path, 0), tasks: extractTasks(path, body) });
  const sheet = `${todayNoteName(new Date())}.md`;

  it("heads Today with a row that starts today's sheet, also on t", () => {
    const { onOpenToday, onOpenNote, onSearch } = renderWorklog(NOTES);
    const rows = screen.getAllByRole("option");
    expect(rows[0]).toHaveTextContent("Start today's sheet");
    expect(rows[0]).toHaveTextContent(sheet);
    expect(screen.getAllByText("Today")).toHaveLength(1);
    expect(within(rows[0]).queryByRole("button", { name: "Pin to Home" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start today's sheet" }));
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "t" });
    expect(onOpenToday).toHaveBeenCalledTimes(3);
    expect(onOpenNote).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("puts today's sheet first under Today once it exists, shown once", () => {
    const { onOpenNote } = renderWorklog({ ...NOTES, [sheet]: meta(sheet, 10, "Standup") });
    const rows = screen.getAllByRole("option");
    expect(rows).toHaveLength(3);
    const title = sheet.replace(/\.md$/, "");
    fireEvent.click(within(rows[0]).getByRole("button", { name: `${title}, today's sheet` }));
    expect(onOpenNote).toHaveBeenCalledWith(sheet);
    expect(screen.queryByText("Start today's sheet")).not.toBeInTheDocument();
  });

  it("offers Quick jot in the Today row's menu only, before and after the sheet exists", () => {
    const onQuickJot = vi.fn();
    const handlers = { onOpenNote: vi.fn(), onNewNote: vi.fn(), onSearch: vi.fn(), onClose: vi.fn(), onOpenToday: vi.fn(), onQuickJot };
    const { unmount } = render(
      <Provider>
        <Hydrate metadata={NOTES}>
          <HomeFeed {...handlers} />
        </Hydrate>
      </Provider>,
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "Start today's sheet" }), { clientX: 40, clientY: 80 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Quick jot" }));
    expect(onQuickJot).toHaveBeenCalledTimes(1);

    fireEvent.contextMenu(screen.getByRole("button", { name: "old" }), { clientX: 40, clientY: 80 });
    expect(screen.queryByRole("menuitem", { name: "Quick jot" })).not.toBeInTheDocument();
    unmount();

    render(
      <Provider>
        <Hydrate metadata={{ ...NOTES, [sheet]: meta(sheet, 10) }}>
          <HomeFeed {...handlers} />
        </Hydrate>
      </Provider>,
    );
    const title = sheet.replace(/\.md$/, "");
    fireEvent.contextMenu(screen.getByRole("button", { name: `${title}, today's sheet` }), { clientX: 40, clientY: 80 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Quick jot" }));
    expect(onQuickJot).toHaveBeenCalledTimes(2);
  });

  it("lists open tasks and opens one at its line", () => {
    const { onOpenTask } = renderWorklog({ "log.md": withTasks("log.md", "# Log\n- [x] shipped\n- [ ] write the review") });
    const tasks = screen.getByRole("region", { name: "Open tasks" });
    fireEvent.click(within(tasks).getByRole("button", { name: "write the review, in log" }));
    expect(onOpenTask).toHaveBeenCalledWith("log.md", 2);
    expect(within(tasks).queryByText("shipped")).not.toBeInTheDocument();
  });

  it("folds the open tasks", () => {
    renderWorklog({ "log.md": withTasks("log.md", "- [ ] one") });
    const toggle = screen.getByRole("button", { name: "1 open task" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Open tasks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "one, in log" })).not.toBeInTheDocument();
  });

  it("shows a quiet stats line", () => {
    renderWorklog({ "log.md": withTasks("log.md", "- [ ] a\n- [ ] b"), "old.md": meta("old.md", 60 * 24 * 30) });
    expect(screen.getByText(/^2 notes · 1 edited today/)).toHaveTextContent("2 notes · 1 edited today · 2 open tasks");
  });
});
