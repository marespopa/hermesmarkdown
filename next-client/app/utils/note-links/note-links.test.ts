import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildBacklinkIndex } from "./backlinks";
import { createLinkResolver } from "./link-resolver";
import { findRewriteCandidates, mapMovedPath, rewriteLinksInText, type PathMove } from "./rewrite-links";
import { lineColumnAt, parseLinkTarget, scanWikiLinks } from "./wikilink-scan";

function meta(path: string, links: string[] = []): FileMetadata {
  return {
    path, name: path.split("/").pop()!, tags: [], links, frontmatter: {}, modifiedAt: 0,
    wordCount: 0, tasks: [], handle: null,
  };
}
const vault = (...items: FileMetadata[]) => Object.fromEntries(items.map((m) => [m.path, m]));

describe("wikilink-scan", () => {
  it("parses targets", () => {
    expect(parseLinkTarget(" Note ")).toEqual({ target: "Note", heading: null, alias: null });
    expect(parseLinkTarget("Note#H|a")).toEqual({ target: "Note", heading: "H", alias: "a" });
    expect(parseLinkTarget("folder/Note.md|a").target).toBe("folder/Note.md");
  });

  it("finds links and embeds with offsets", () => {
    const text = "see [[ Old #Plan|x]] and ![[Img]]";
    const [link, embed] = scanWikiLinks(text);
    expect(text.slice(link.targetFrom, link.targetTo)).toBe("Old");
    expect(text.slice(link.from, link.to)).toBe("[[ Old #Plan|x]]");
    expect(embed.embed).toBe(true);
    expect(text.slice(embed.from, embed.to)).toBe("![[Img]]");
  });

  it("skips fences and inline code, keeps frontmatter", () => {
    const text = ["---", 'r: "[[Front]]"', "---", "`[[a]]` ``[[b]]`` [[c]]", "```", "[[d]]", "```", "~~~", "[[e]]", "~~~"].join("\n");
    expect(scanWikiLinks(text).map((o) => o.target)).toEqual(["Front", "c"]);
  });

  it("computes line and column", () => {
    expect(lineColumnAt("ab\ncd", 4)).toEqual({ line: 2, column: 1 });
  });
});

describe("link resolver and backlinks", () => {
  const files = vault(meta("a/Note.md"), meta("b/Note.md"), meta("a/x.md", ["Note"]), meta("b/y.md", ["Note|al", "a/Note#H", "Missing"]));

  it("resolves by path, relative and nearest basename", () => {
    const r = createLinkResolver(files);
    expect(r.resolve("a/Note")?.path).toBe("a/Note.md");
    expect(r.resolve("Note", "b/y.md")?.path).toBe("b/Note.md");
    expect(r.resolve("Note", "a/x.md")?.path).toBe("a/Note.md");
    expect(r.resolve("Nope")).toBeNull();
  });

  it("breaks basename ties by folder distance, then alphabetically", () => {
    const r = createLinkResolver(vault(meta("b/Note.md"), meta("a/Note.md"), meta("c/d/Note.md")));
    expect(r.resolve("Note", "z.md")?.path).toBe("a/Note.md");
    expect(r.resolve("Note", "c/z.md")?.path).toBe("a/Note.md");
    expect(r.resolve("Note", "c/d/z.md")?.path).toBe("c/d/Note.md");
  });

  it("counts backlinks via alias, heading and embed targets", () => {
    const index = buildBacklinkIndex(vault(meta("T.md"), meta("s.md", ["T|al", "T#H"]), meta("e.md", ["T"])));
    expect(index.get("T.md")).toEqual(["e.md", "s.md"]);
  });

  it("builds backlinks, nearest note only, ignoring unresolved and self links", () => {
    const index = buildBacklinkIndex({ ...files, "a/Note.md": meta("a/Note.md", ["Note"]) });
    expect(index.get("a/Note.md")).toEqual(["a/x.md", "b/y.md"]);
    expect(index.get("b/Note.md")).toEqual(["b/y.md"]);
  });
});

describe("rewrite-links", () => {
  function run(text: string, moves: PathMove[], files: FileMetadata[], source: string) {
    const before = vault(...files);
    const after = vault(...files.map((m) => meta(mapMovedPath(m.path, moves))));
    return rewriteLinksInText(text, {
      sourceOldPath: source,
      sourceNewPath: mapMovedPath(source, moves),
      before: createLinkResolver(before),
      after: createLinkResolver(after),
      moves,
    });
  }
  const rename: PathMove[] = [{ from: "Old.md", to: "New.md" }];

  it("rewrites names keeping heading, alias, embed and .md", () => {
    const files = [meta("Old.md"), meta("s.md")];
    expect(run("[[Old]] [[Old#Plan|the plan]] ![[Old]] [[Old.md]]", rename, files, "s.md"))
      .toBe("[[New]] [[New#Plan|the plan]] ![[New]] [[New.md]]");
  });

  it("skips code, unresolved links and case-only renames", () => {
    const files = [meta("Old.md"), meta("s.md")];
    expect(run("`[[Old]]`\n```\n[[Old]]\n```\n[[Missing]]", rename, files, "s.md")).toBeNull();
    expect(run("[[old]]", [{ from: "Old.md", to: "old.md" }], files, "s.md")).toBeNull();
  });

  it("rewrites path links after a folder rename, leaves bare links on a move", () => {
    const files = [meta("Projects/Alpha.md"), meta("s.md")];
    const folder: PathMove[] = [{ from: "Projects", to: "Work" }];
    expect(run("[[Projects/Alpha]] [[Alpha]]", folder, files, "s.md")).toBe("[[Work/Alpha]] [[Alpha]]");
  });

  it("uses the full path when the new bare name is ambiguous", () => {
    const files = [meta("Old.md"), meta("dir/New.md"), meta("s.md")];
    expect(run("[[Old]]", rename, files, "s.md")).toBe("[[New]]");
    const ambiguous = [meta("a/Old.md"), meta("New.md"), meta("s.md")];
    expect(run("[[Old]]", [{ from: "a/Old.md", to: "z/New.md" }], ambiguous, "s.md")).toBe("[[z/New]]");
  });

  it("rewrites several links on one line", () => {
    const files = [meta("Old.md"), meta("s.md")];
    expect(run("[[Old]] and [[Old|b]], ![[Old]]", rename, files, "s.md")).toBe("[[New]] and [[New|b]], ![[New]]");
  });

  it("rewrites a relative link in a note that moves away from its target", () => {
    const files = [meta("a/s.md"), meta("a/sub/T.md"), meta("0/T.md")];
    expect(run("[[sub/T]]", [{ from: "a/s.md", to: "b/s.md" }], files, "a/s.md")).toBe("[[a/sub/T]]");
  });

  it("skips double-backtick spans and a hermes-board fence", () => {
    const files = [meta("Old.md"), meta("s.md")];
    expect(run("``[[Old]]``\n```hermes-board\n[[Old]]\n```", rename, files, "s.md")).toBeNull();
  });

  it("finds candidates: moved sources and linkers only", () => {
    const files = [meta("Old.md"), meta("s.md", ["Old"]), meta("t.md", ["Other"])];
    const after = vault(meta("New.md"), meta("s.md", ["Old"]), meta("t.md"));
    expect(findRewriteCandidates(vault(...files), after, rename)).toEqual(["s.md"]);
  });
});
