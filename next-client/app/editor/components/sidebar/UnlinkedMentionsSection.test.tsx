import { act, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import UnlinkedMentionsSection from "./UnlinkedMentionsSection";

const search = vi.hoisted(() => ({ find: vi.fn(), available: true }));
vi.mock("@/app/services/content-search-client", () => ({
  findNoteMentions: (...args: unknown[]) => search.find(...args),
  isContentSearchAvailable: () => search.available,
}));

function meta(path: string, frontmatter: Record<string, unknown> = {}): FileMetadata {
  return { path, name: path.split("/").pop()!, tags: [], links: [], frontmatter, modifiedAt: 0, wordCount: 0, tasks: [], handle: { path } } as unknown as FileMetadata;
}

function setup(files: Record<string, FileMetadata>, path: string) {
  const store = createStore();
  store.set(atom_fileMetadata, files);
  const onOpen = vi.fn().mockResolvedValue(undefined);
  render(
    <Provider store={store}>
      <UnlinkedMentionsSection path={path} onOpen={onOpen} />
    </Provider>,
  );
  return { store, onOpen };
}

const expand = () => fireEvent.click(screen.getByRole("button", { name: "Unlinked mentions" }));
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(700); });
const region = () => screen.queryByRole("region", { name: "Unlinked mentions" });

describe("UnlinkedMentionsSection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Collapsed state is remembered in storage across renders.
    localStorage.removeItem("sidebarCollapsed");
    search.available = true;
    search.find.mockReset();
    search.find.mockResolvedValue({ hits: [], pending: 0, capped: false });
  });
  afterEach(() => vi.useRealTimers());

  const files = {
    "Zebra Plan.md": meta("Zebra Plan.md", { title: "Stripes" }),
    "other/Notes.md": meta("other/Notes.md"),
  };
  const hit = { path: "other/Notes.md", name: "Notes.md", line: 4, column: 2, snippet: "about Zebra Plan" };

  it("searches the base name and frontmatter title in the other notes", async () => {
    setup(files, "Zebra Plan.md");
    await settle();
    expect(search.find).toHaveBeenCalledWith(["Zebra Plan", "Stripes"], ["other/Notes.md"], 50);
  });

  it("stays hidden when nothing mentions the note", async () => {
    setup(files, "Zebra Plan.md");
    await settle();
    expect(region()).not.toBeInTheDocument();
  });

  it("appears collapsed once there are mentions", async () => {
    search.find.mockResolvedValue({ hits: [hit], pending: 0, capped: false });
    setup(files, "Zebra Plan.md");
    await settle();
    expect(region()).toBeInTheDocument();
    expect(screen.queryByTitle("other/Notes.md")).not.toBeInTheDocument();
  });

  it("opens a hit's note and puts the caret on the mention", async () => {
    search.find.mockResolvedValue({ hits: [hit], pending: 1, capped: false });
    const { store, onOpen } = setup(files, "Zebra Plan.md");
    await settle();
    expand();
    expect(screen.getByText("Some notes are still being indexed")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("other/Notes.md"));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onOpen).toHaveBeenCalledWith({ path: "other/Notes.md" }, "other/Notes.md");
    expect(store.get(atom_pendingScrollTarget)).toEqual({ path: "other/Notes.md", line: 4, column: 2 });
  });

  it("stays hidden without search", async () => {
    search.available = false;
    setup(files, "Zebra Plan.md");
    await settle();
    expect(search.find).not.toHaveBeenCalled();
    expect(region()).not.toBeInTheDocument();
  });

  it("stays hidden when the title is too short to search", async () => {
    setup({ "A.md": meta("A.md"), "b.md": meta("b.md") }, "A.md");
    await settle();
    expect(search.find).not.toHaveBeenCalled();
    expect(region()).not.toBeInTheDocument();
  });
});
