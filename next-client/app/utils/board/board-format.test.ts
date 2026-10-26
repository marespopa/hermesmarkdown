// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  boardFenceRanges,
  boardTextForReading,
  hasConflictMarkers,
  NEW_BOARD_MARKDOWN,
  parseBoard,
  serializeBoard,
  stripBoardFence,
  type BoardElement,
  type BoardScene,
} from "./board-format";
import { pickBoardAppState } from "./board-serialize";

const FENCE = "```";
const el = (over: Record<string, unknown> = {}): BoardElement => ({ id: "a1", type: "freedraw", ...over }) as BoardElement;
const scene = (elements: BoardElement[] = [], appState = {}): BoardScene => ({ appState, elements, files: {} });
const doc = { head: "---\nhermes: board\nboard-version: 1\n---\n\nSome prose.\n\n", tail: "\n\nAfter the board.\n" };

function fence(body: string) {
  return `${FENCE}hermes-board\n${body}\n${FENCE}`;
}

describe("serializeBoard / parseBoard", () => {
  it("round-trips a serialized board with prose before and after", () => {
    const text = serializeBoard(doc, scene([el({ x: 1.234, y: 2 }), el({ id: "b2", type: "text" })], { gridModeEnabled: true }));
    const p = parseBoard(text);
    expect(p.ok).toBe(true);
    if (p.ok) expect(serializeBoard(p.doc, p.scene)).toBe(text);
  });

  it("round-trips NEW_BOARD_MARKDOWN", () => {
    const p = parseBoard(NEW_BOARD_MARKDOWN);
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.scene.elements).toEqual([]);
      expect(serializeBoard(p.doc, p.scene)).toBe(NEW_BOARD_MARKDOWN);
    }
  });

  it("gives the same bytes twice, with ordered keys", () => {
    const a = el({ z: 1, a: 2, roundness: { type: 3, abc: 1 } });
    const text = serializeBoard(doc, scene([a]));
    expect(serializeBoard(doc, scene([a]))).toBe(text);
    const line = text.split("\n").find((l) => l.startsWith('{"id"'))!;
    expect(line).toBe('{"id":"a1","type":"freedraw","a":2,"roundness":{"abc":1,"type":3},"z":1}');
  });

  it("drops deleted elements, rounds coordinates and keeps other numbers", () => {
    const text = serializeBoard(
      doc,
      scene([
        el({ x: 1.23456, y: -0, width: 10.005, height: 3, points: [[0, 0], [1.2549, 3.5]], seed: 123456789, version: 3, angle: 0.123456 }),
        el({ id: "gone", isDeleted: true }),
      ]),
    );
    expect(text).not.toContain('"gone"');
    expect(text).toContain('"x":1.23');
    expect(text).toContain('"y":0');
    expect(text).not.toContain("-0");
    expect(text).toContain('"points":[[0,0],[1.25,3.5]]');
    expect(text).toContain('"seed":123456789');
    expect(text).toContain('"angle":0.123456');
  });

  it("keeps only allow-listed appState keys", () => {
    expect(pickBoardAppState({ scrollX: 4, zoom: 1, selectedElementIds: {}, viewBackgroundColor: "#fff", gridModeEnabled: false })).toEqual({
      gridModeEnabled: false,
      viewBackgroundColor: "#fff",
    });
  });

  it("writes one element per line", () => {
    const text = serializeBoard(doc, scene([el(), el({ id: "b" }), el({ id: "c" })]));
    const lines = text.split("\n").filter((l) => l.startsWith('{"id"'));
    expect(lines).toHaveLength(3);
    expect(lines[0].endsWith("},")).toBe(true);
    expect(lines[2].endsWith("},")).toBe(false);
  });

  it("treats a missing fence as an empty scene and appends one on save", () => {
    const p = parseBoard("Just prose.\n");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.scene.elements).toEqual([]);
    expect(serializeBoard(p.doc, p.scene).startsWith(`Just prose.\n\n${FENCE}hermes-board\n`)).toBe(true);
  });

  it("gives a blank file the board frontmatter so it stays a board", () => {
    const p = parseBoard("");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const out = serializeBoard(p.doc, p.scene);
    expect(out.startsWith("---\nhermes: board\nboard-version: 1\n---\n\n")).toBe(true);
    expect(parseBoard("  \n").ok).toBe(true);
  });

  it("reports invalid JSON, an unclosed fence and version 2 as invalid", () => {
    expect(parseBoard(fence("{nope")).ok).toBe(false);
    expect(parseBoard(`${FENCE}hermes-board\n{"type":"hermes-board"`)).toEqual({ ok: false, error: "invalid" });
    expect(parseBoard(fence("{nope"))).toEqual({ ok: false, error: "invalid" });
    expect(parseBoard(fence('{"type":"hermes-board","version":2,"elements":[]}'))).toEqual({ ok: false, error: "invalid" });
  });

  it("reports conflict markers", () => {
    const inside = fence('{"type":"hermes-board","version":1,\n<<<<<<< HEAD\n"elements":[]}\n=======\n{}\n>>>>>>> theirs');
    expect(parseBoard(inside)).toEqual({ ok: false, error: "conflict" });
    expect(parseBoard(`<<<<<<< HEAD\nmine\n=======\ntheirs\n>>>>>>> x\n${fence("{nope")}`)).toEqual({ ok: false, error: "conflict" });
    expect(hasConflictMarkers("a\n=======\nb")).toBe(true);
    expect(hasConflictMarkers("a\nb")).toBe(false);
  });

  it("ignores a setext underline in prose outside a valid fence", () => {
    const text = serializeBoard({ head: "Title\n=======\n\n", tail: "\n" }, scene());
    expect(parseBoard(text).ok).toBe(true);
  });
});

describe("stripBoardFence", () => {
  it("returns a note without a fence as the same string", () => {
    const note = "# Note\n\n- [ ] task\n";
    expect(stripBoardFence(note)).toBe(note);
  });

  it("blanks fence lines and keeps the line count", () => {
    const text = serializeBoard(doc, scene([el(), el({ id: "b" })]));
    const out = stripBoardFence(text);
    expect(out.split("\n")).toHaveLength(text.split("\n").length);
    expect(out).not.toContain("freedraw");
    expect(out).not.toContain(FENCE);
    expect(out).toContain("Some prose.");
    expect(out).toContain("After the board.");
  });

  it("strips every board fence and keeps links and tags outside", () => {
    const text = `[[Link]] #tag\n${fence("{}")}\nmid\n${fence("{}")}\nend`;
    const out = stripBoardFence(text);
    expect(out.split("\n")).toHaveLength(text.split("\n").length);
    expect(out).toBe("[[Link]] #tag\n\n\n\nmid\n\n\n\nend");
  });
});

describe("boardTextForReading", () => {
  it("gives prose plus an element count", () => {
    const text = serializeBoard(doc, scene([el(), el({ id: "b" })]));
    const out = boardTextForReading(text);
    expect(out).toContain("Some prose.");
    expect(out).toContain("(board with 2 elements)");
    expect(out).not.toContain("freedraw");
  });

  it("says when the board can't be read", () => {
    expect(boardTextForReading(`Hi\n${fence("{nope")}`)).toContain("(board that couldn't be read)");
  });

  it("returns a note without a fence unchanged", () => {
    expect(boardTextForReading("plain")).toBe("plain");
  });
});

describe("boardFenceRanges", () => {
  it("finds none in a note without a board", () => {
    expect(boardFenceRanges("plain\ntext")).toEqual([]);
  });

  it("covers exactly the fence, opening line start to closing line end", () => {
    const text = `Intro\n${fence("{}")}\nOutro`;
    const [range] = boardFenceRanges(text);
    expect(boardFenceRanges(text)).toHaveLength(1);
    expect(text.slice(range[0], range[1])).toBe(fence("{}"));
  });

  it("runs an unclosed fence to the end of the text", () => {
    const text = `Intro\n${FENCE}hermes-board\n{"a":1}`;
    const [range] = boardFenceRanges(text);
    expect(text.slice(range[0], range[1])).toBe(`${FENCE}hermes-board\n{"a":1}`);
  });
});
