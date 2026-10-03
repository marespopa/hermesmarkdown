import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useContentIndexSync } from "./use-content-index-sync";

const removeNoteContent = vi.hoisted(() => vi.fn());
vi.mock("@/app/services/content-search-client", () => ({ removeNoteContent }));

const entry = (path: string) => ({ path, name: path, tags: [], links: [], frontmatter: {}, modifiedAt: 1, wordCount: 0, tasks: [], handle: null });

describe("useContentIndexSync", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    removeNoteContent.mockClear();
    store = createStore();
    store.set(atom_fileMetadata, { "a.md": entry("a.md"), "b.md": entry("b.md"), "c.md": entry("c.md") } as any);
    renderHook(() => useContentIndexSync(), {
      wrapper: ({ children }) => React.createElement(Provider, { store }, children),
    });
  });

  it("removes exactly the paths that left the metadata index", () => {
    act(() => store.set(atom_fileMetadata, (prev) => {
      const next = { ...prev };
      delete next["a.md"];
      delete next["c.md"];
      return next;
    }));
    expect(removeNoteContent).toHaveBeenCalledTimes(1);
    expect(removeNoteContent.mock.calls[0][0]).toEqual(["a.md", "c.md"]);
  });

  it("removes everything when the vault closes or switches", () => {
    act(() => store.set(atom_fileMetadata, {}));
    expect(removeNoteContent.mock.calls[0][0]).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("removes nothing when notes are only added", () => {
    act(() => store.set(atom_fileMetadata, (prev) => ({ ...prev, "d.md": entry("d.md") } as any)));
    expect(removeNoteContent).not.toHaveBeenCalled();
  });
});
