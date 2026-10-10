import { describe, expect, it } from "vitest";
import { segmentTokens, textStats } from "./segment-tokens";

// A fake vocabulary: ids 1–3 are words, 10 and 11 are the two halves of 👋
// (each alone decodes to a dangling replacement character).
const VOCAB: Record<number, string> = { 1: "Hello", 2: " world", 3: "!" };
function decode(ids: number[]): string {
  if (ids.join() === "10,11") return "👋";
  return ids.map((id) => VOCAB[id] ?? "�").join("");
}

describe("segmentTokens", () => {
  it("gives each whole token its own segment", () => {
    expect(segmentTokens([1, 2, 3], decode)).toEqual([
      { text: "Hello", ids: [1] },
      { text: " world", ids: [2] },
      { text: "!", ids: [3] },
    ]);
  });

  it("joins the tokens of a split character into one segment", () => {
    expect(segmentTokens([1, 10, 11, 3], decode)).toEqual([
      { text: "Hello", ids: [1] },
      { text: "👋", ids: [10, 11] },
      { text: "!", ids: [3] },
    ]);
  });

  it("decodes no more than the limit", () => {
    expect(segmentTokens([1, 2, 3], decode, 2).map((segment) => segment.text)).toEqual(["Hello", " world"]);
  });

  it("emits a dangling partial character at the end rather than dropping it", () => {
    expect(segmentTokens([1, 10], decode)).toEqual([
      { text: "Hello", ids: [1] },
      { text: "�", ids: [10] },
    ]);
  });
});

describe("textStats", () => {
  it("counts characters as people see them, and words", () => {
    expect(textStats("Hi 👋 there")).toEqual({ characters: 10, words: 3 });
    expect(textStats("   ")).toEqual({ characters: 3, words: 0 });
  });
});
