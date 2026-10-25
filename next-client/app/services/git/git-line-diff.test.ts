import { Chunk } from "@codemirror/merge";
import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { lineChanges } from "./git-line-diff";

const text = (value: string) => Text.of(value.split("\n"));
const changes = (base: string, doc: string) => lineChanges(text(base), text(doc), Chunk.build(text(base), text(doc)));

describe("lineChanges", () => {
  it("reports a change in the middle", () => {
    expect(changes("a\nb\nc", "a\nB\nc")).toEqual([{ firstA: 2, lastA: 2, firstB: 2, lastB: 2 }]);
  });

  it("reports a pure insert with an empty old side", () => {
    expect(changes("a\nc", "a\nb\nc")).toEqual([{ firstA: 2, lastA: 1, firstB: 2, lastB: 2 }]);
  });

  it("reports a pure delete with an empty new side", () => {
    expect(changes("a\nb\nc", "a\nc")).toEqual([{ firstA: 2, lastA: 2, firstB: 2, lastB: 1 }]);
  });

  it("shows no spurious change when Enter is pressed at a line end", () => {
    expect(changes("a\nb", "a\n\nb")).toEqual([{ firstA: 2, lastA: 1, firstB: 2, lastB: 2 }]);
  });

  it("reports nothing for equal texts", () => {
    expect(changes("a\nb", "a\nb")).toEqual([]);
  });
});
