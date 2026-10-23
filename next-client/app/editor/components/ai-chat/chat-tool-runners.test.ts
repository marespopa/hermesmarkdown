// @vitest-environment node
import { describe, expect, it } from "vitest";
import { noteDescription, readNoteOutput, searchNotesOutput } from "./chat-tool-runners";
import type { FileMetadata } from "@/app/atoms/metadata";

const file = { path: "Sketch.board.md", name: "Sketch.board.md", tags: [], frontmatter: {} } as unknown as FileMetadata;
const board = [
  "---",
  "hermes: board",
  "---",
  "",
  "Caption text",
  "```hermes-board",
  '{"type":"hermes-board","version":1,"appState":{},"files":{},"elements":[',
  '{"id":"a","type":"freedraw"},',
  '{"id":"b","type":"text"}',
  "]}",
  "```",
  "",
].join("\n");

describe("readNoteOutput for a board", () => {
  it("returns the prose and an element count, not the JSON", () => {
    const out = readNoteOutput("Sketch", file, board);
    expect(out).toContain("Caption text");
    expect(out).toContain("(board with 2 elements)");
    expect(out).not.toContain('"type":"freedraw"');
  });

  it("still refuses a private board", () => {
    const text = board.replace("hermes: board", "hermes: board\nprivate: true");
    expect(readNoteOutput("Sketch", file, text)).toContain("is private");
  });
});

describe("searchNotesOutput with frontmatter properties", () => {
  const note = (path: string, frontmatter: Record<string, unknown>, tags: string[] = []) =>
    ({ path, name: path, tags, frontmatter }) as unknown as FileMetadata;
  const meta = {
    "Roadmap.md": note("Roadmap.md", { title: "Roadmap", aliases: "Plan, Q4 goals", description: "What ships this quarter." }, ["work"]),
    "Groceries.md": note("Groceries.md", { description: "Weekly shopping list for the market." }),
  };
  const paths = Object.keys(meta);

  it("matches an alias and shows the description", () => {
    expect(searchNotesOutput("q4", meta, paths, null)).toContain(
      "- [[Roadmap]] (Roadmap): name, alias or tag match — What ships this quarter.",
    );
  });

  it("matches a description", () => {
    expect(searchNotesOutput("market", meta, paths, null)).toContain("- [[Groceries]]: description match — Weekly shopping list");
  });

  it("adds the description to content hits", () => {
    const hits = [{ path: "Roadmap.md", line: 4, snippet: "launch beta" }];
    expect(searchNotesOutput("beta", meta, paths, hits as never)).toContain(
      "- [[Roadmap]], line 4: launch beta — What ships this quarter.",
    );
  });

  it("caps a long description on one line", () => {
    const long = note("Long.md", { description: `${"word ".repeat(60)}\nmore` });
    const text = noteDescription(long);
    expect(text).toHaveLength(160);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toContain("\n");
  });
});
