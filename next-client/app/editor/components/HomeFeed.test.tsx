import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_userName } from "@/app/atoms/ui-atoms";
import HomeFeed from "./HomeFeed";

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

const Hydrate = ({ metadata, userName = "", children }: { metadata: Record<string, FileMetadata>; userName?: string; children: React.ReactNode }) => {
  useHydrateAtoms([[atom_fileMetadata, metadata], [atom_userName, userName]] as any);
  return children;
};

function renderFeed(metadata: Record<string, FileMetadata>, userName = "") {
  const handlers = { onOpenNote: vi.fn(), onNewNote: vi.fn(), onSearch: vi.fn(), onClose: vi.fn() };
  render(
    <Provider>
      <Hydrate metadata={metadata} userName={userName}>
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

  it("opens the palette with a typed character and leaves on Escape", () => {
    const { onSearch, onClose } = renderFeed(NOTES);
    fireEvent.keyDown(window, { key: "p" });
    expect(onSearch).toHaveBeenCalledWith("p");
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

  it("greets the user by name, and leaves the greeting out without one", () => {
    renderFeed(NOTES, "Ada");
    expect(screen.getByText("Welcome, Ada!")).toBeInTheDocument();
    cleanup();
    renderFeed(NOTES);
    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
  });

  it("shows a quiet start prompt for an empty vault", () => {
    const { onNewNote } = renderFeed({});
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start writing" }));
    expect(onNewNote).toHaveBeenCalled();
  });
});
