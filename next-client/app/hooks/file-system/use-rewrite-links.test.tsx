import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useRewriteLinksAfterMove } from "./use-rewrite-links";

const writeThrough = vi.fn();
vi.mock("./use-note-buffer", () => ({ useNoteBuffer: () => ({ writeThrough }) }));

function meta(path: string, links: string[] = []): FileMetadata {
  return { path, name: path.split("/").pop()!, tags: [], links, frontmatter: {}, modifiedAt: 0, wordCount: 0, tasks: [], handle: null };
}

function fakeVault() {
  const file = { kind: "file" };
  return { getFileHandle: vi.fn().mockResolvedValue(file) } as unknown as FileSystemDirectoryHandle;
}

describe("useRewriteLinksAfterMove", () => {
  it("writes rewritten text to the new source paths and counts outcomes", async () => {
    const store = createStore();
    store.set(atom_vaultHandle, fakeVault());
    store.set(atom_fileMetadata, { "New.md": meta("New.md"), "s.md": meta("s.md", ["Old"]), "t.md": meta("t.md", ["Old"]) });
    const before = { "Old.md": meta("Old.md"), "s.md": meta("s.md", ["Old"]), "t.md": meta("t.md", ["Old"]) };
    const texts: Record<string, string | null> = {};
    writeThrough.mockImplementation(async (path: string, _h: unknown, transform: (t: string) => string | null) => {
      if (path === "t.md") throw new Error("boom");
      texts[path] = transform("see [[Old]]");
      return { result: "written", inBuffer: false };
    });
    const { result } = renderHook(() => useRewriteLinksAfterMove(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    const outcome = await result.current(before, [{ from: "Old.md", to: "New.md" }]);
    expect(outcome).toEqual({ updated: 1, failed: 1 });
    expect(texts["s.md"]).toBe("see [[New]]");
  });
});
