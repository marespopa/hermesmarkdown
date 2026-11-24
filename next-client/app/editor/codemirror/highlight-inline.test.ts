import { describe, expect, it } from "vitest";
import { processInline, type MarkRange } from "./highlight-inline";

function emphasis(text: string) {
  const ranges: MarkRange[] = [];
  processInline(ranges, text, 0);
  const slice = (cls: string) =>
    ranges.filter((r) => r.class.includes(cls)).map((r) => text.slice(r.from, r.to));
  return { italic: slice("italic"), bold: slice("font-bold") };
}

describe("processInline emphasis", () => {
  it("makes **Label:** bold, never italic", () => {
    expect(emphasis("**Hermes Implementation:** text")).toEqual({
      italic: [],
      bold: ["Hermes Implementation:"],
    });
  });

  it("keeps **bold** bold inside an italic run", () => {
    const { italic, bold } = emphasis("*a **b** c*");
    expect(bold).toEqual(["b"]);
    expect(italic).toEqual(["a **b** c"]);
  });

  it("italicizes *word* and _word_", () => {
    expect(emphasis("*it* and _test_").italic).toEqual(["it", "test"]);
  });

  it("makes __word__ bold", () => {
    expect(emphasis("__bold__ x")).toEqual({ italic: [], bold: ["bold"] });
  });

  it("ignores underscores inside words", () => {
    expect(emphasis("word_split and a_b_c").italic).toEqual([]);
    expect(emphasis("snake_case_name _ok_").italic).toEqual(["ok"]);
  });

  it("ignores underscores in link URLs", () => {
    expect(emphasis("[a](http://x.com/a_b_c_d)").italic).toEqual([]);
  });
});
