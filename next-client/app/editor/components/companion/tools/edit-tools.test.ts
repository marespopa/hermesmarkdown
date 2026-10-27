import { describe, expect, it } from "vitest";
import { applyEdits, replaceCodeBlock } from "./edit-tools";

describe("applyEdits", () => {
  const text = "# Roadmap\n- Ship the beta in Q3\n- Price review\n";

  it("applies an edit that matches once", () => {
    const result = applyEdits(text, [{ find: "in Q3", replace: "in Q4" }]);
    expect(result).toEqual({ ok: true, text: "# Roadmap\n- Ship the beta in Q4\n- Price review\n", summary: "1 edit" });
  });

  it("applies edits in order", () => {
    const result = applyEdits(text, [{ find: "Q3", replace: "Q4" }, { find: "Q4\n", replace: "Q4 (moved)\n" }]);
    expect(result.ok && result.text).toContain("Ship the beta in Q4 (moved)");
  });

  it("refuses an edit that matches 0 times, changing nothing", () => {
    const result = applyEdits(text, [{ find: "Q3", replace: "Q4" }, { find: "Q1", replace: "Q2" }]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/Edit 2: the find text matches 0 times/);
  });

  it("refuses an edit that matches several times", () => {
    const result = applyEdits("- todo\n- todo\n", [{ find: "todo", replace: "done" }]);
    expect(!result.ok && result.reason).toMatch(/matches 2 times/);
  });

  it("refuses edits that change nothing", () => {
    expect(applyEdits(text, [{ find: "Q3", replace: "Q3" }]).ok).toBe(false);
  });
});

describe("replaceCodeBlock", () => {
  const doc = "# Build\n```python\nprint('a')\n```\n\n```sh\nmake\n```\n";

  it("replaces a block's code by index, keeping its fences", () => {
    const result = replaceCodeBlock(doc, { index: 1 }, "make test\n");
    expect(result.ok && result.text).toBe("# Build\n```python\nprint('a')\n```\n\n```sh\nmake test\n```\n");
  });

  it("finds a block by language and first line", () => {
    const result = replaceCodeBlock(doc, { lang: "python", firstLine: "print('a')" }, "print('b')");
    expect(result.ok && result.text).toContain("```python\nprint('b')\n```");
  });

  it("refuses when no block matches", () => {
    const result = replaceCodeBlock(doc, { lang: "rust" }, "fn main() {}");
    expect(!result.ok && result.reason).toMatch(/No code blocks match/);
  });
});
