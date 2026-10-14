// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readNoteOutput } from "./chat-tool-runners";
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
