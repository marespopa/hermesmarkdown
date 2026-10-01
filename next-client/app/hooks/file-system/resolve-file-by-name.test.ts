// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { resolveFileMetaByName } from "./resolve-file-by-name";

const metadata = (...paths: string[]): Record<string, FileMetadata> =>
  Object.fromEntries(
    paths.map((path) => [
      path,
      { path, name: path.split("/").pop()!, tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0, tasks: [], handle: null },
    ]),
  );

describe("resolveFileMetaByName", () => {
  const files = metadata("a/notes.md", "b/notes.md", "b/deep/notes.md", "b/sub/todo.md", "todo.md");

  it("prefers a vault-relative exact path", () => {
    expect(resolveFileMetaByName("b/notes", files, "a/x.md")?.path).toBe("b/notes.md");
  });

  it("prefers the same-named note in the linking note's folder", () => {
    expect(resolveFileMetaByName("notes", files, "b/x.md")?.path).toBe("b/notes.md");
    expect(resolveFileMetaByName("notes", files, "a/x.md")?.path).toBe("a/notes.md");
    expect(resolveFileMetaByName("notes", files, "b/deep/x.md")?.path).toBe("b/deep/notes.md");
  });

  it("resolves paths relative to the linking note's folder", () => {
    expect(resolveFileMetaByName("sub/todo", files, "b/x.md")?.path).toBe("b/sub/todo.md");
  });

  it("is deterministic without a source path", () => {
    expect(resolveFileMetaByName("notes", files)?.path).toBe("a/notes.md");
    expect(resolveFileMetaByName("notes|alias", metadata("b/notes.md", "a/notes.md"))?.path).toBe("a/notes.md");
  });

  it("returns null for unknown notes", () => {
    expect(resolveFileMetaByName("missing", files, "b/x.md")).toBeNull();
  });
});
