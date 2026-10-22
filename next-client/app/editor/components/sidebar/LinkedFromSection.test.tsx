import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import LinkedFromSection from "./LinkedFromSection";

function meta(path: string, links: string[] = []): FileMetadata {
  return { path, name: path.split("/").pop()!, tags: [], links, frontmatter: {}, modifiedAt: 0, wordCount: 0, tasks: [], handle: { path } };
}

function setup(onOpen = vi.fn().mockResolvedValue(undefined)) {
  const store = createStore();
  store.set(atom_fileMetadata, {
    "Target.md": meta("Target.md"),
    "a/Same.md": meta("a/Same.md", ["Target"]),
    "b/Same.md": meta("b/Same.md", ["Target|alias"]),
    "Lonely.md": meta("Lonely.md"),
  });
  const view = (path: string) => (
    <Provider store={store}>
      <LinkedFromSection path={path} onOpen={onOpen} />
    </Provider>
  );
  return { store, onOpen, ...render(view("Target.md")), view };
}

describe("LinkedFromSection", () => {
  it("lists linking notes, with the folder when titles repeat", () => {
    setup();
    expect(screen.getAllByTitle(/Same\.md$/)).toHaveLength(2);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
  });

  it("stays hidden when no note links here", () => {
    const { rerender, view } = setup();
    rerender(view("Lonely.md"));
    expect(screen.queryByRole("region", { name: "Linked from" })).not.toBeInTheDocument();
  });

  it("opens the source and puts the caret on the link", async () => {
    const onOpen = vi.fn();
    const { store } = setup(onOpen);
    onOpen.mockImplementation(async (_h, path: string) => {
      store.set(atom_openFiles, {
        [path]: { content: "intro\nsee [[Target]]" } as never,
      });
    });
    fireEvent.click(screen.getAllByTitle("a/Same.md")[0]);
    await waitFor(() => expect(store.get(atom_pendingScrollTarget)).toEqual({ path: "a/Same.md", line: 2, column: 4 }));
    expect(onOpen).toHaveBeenCalledWith({ path: "a/Same.md" }, "a/Same.md");
  });
});
