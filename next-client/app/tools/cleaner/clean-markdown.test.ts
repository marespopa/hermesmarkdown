import { describe, expect, it } from "vitest";
import { cleanMarkdown } from "./clean-markdown";
import { CLEANER_EXAMPLES } from "./cleaner-examples";

const clean = (text: string) => cleanMarkdown(text).markdown;
const fixes = (text: string) => Object.fromEntries(cleanMarkdown(text).fixes.map(({ id, count }) => [id, count]));

describe("cleanMarkdown", () => {
  it("returns nothing for blank input", () => {
    expect(clean("  \n\n")).toBe("");
  });

  describe("headings", () => {
    it("adds the missing space, drops closing hashes and puts blank lines around", () => {
      expect(clean("##Goals\nText\n## Status ##")).toBe("## Goals\n\nText\n\n## Status\n");
      expect(fixes("##Goals\nText")).toEqual({ heading: 1, "blank-lines": 1 });
    });

    it("leaves a #tag alone but fixes a single # before several words", () => {
      expect(clean("#tag")).toBe("#tag\n");
      expect(clean("#Two words")).toBe("# Two words\n");
    });

    it("turns a one-line underlined heading into #", () => {
      expect(clean("Title\n=====\nBody")).toBe("# Title\n\nBody\n");
      expect(clean("Sub\n---")).toBe("## Sub\n");
      expect(fixes("Title\n=====")).toEqual({ setext: 1 });
    });

    it("leaves a multi-line underlined paragraph as written", () => {
      expect(clean("One\nTwo\n---")).toBe("One\nTwo\n---\n");
    });
  });

  it("normalizes rules, with a blank line so a rule never becomes a heading", () => {
    expect(clean("Text\n***\nMore")).toBe("Text\n\n---\n\nMore\n");
    expect(fixes("Text\n\n* * *")).toEqual({ rule: 1 });
  });

  describe("lists", () => {
    it("uses - bullets and nests by indentation at the parent's content column", () => {
      expect(clean("* a\n    * b\n\t* c\n+ d")).toBe("- a\n  - b\n  - c\n- d\n");
      expect(fixes("* a\n    * b\n\t* c\n+ d")).toEqual({ "list-marker": 4, "list-indent": 2 });
    });

    it("nests under numbered items at three spaces and uses 1.", () => {
      expect(clean("1) a\n   - b\n2) c")).toBe("1. a\n   - b\n2. c\n");
    });

    it("turns pasted bullet glyphs into a list", () => {
      expect(clean("• one\n•two")).toBe("- one\n- two\n");
    });

    it("separates a list from the paragraph above it", () => {
      expect(clean("Intro\n- a")).toBe("Intro\n\n- a\n");
    });

    it("keeps a number that can't start a list mid-paragraph as text", () => {
      expect(clean("We met in\n2019. A year")).toBe("We met in\n2019. A year\n");
    });

    it("moves continuation paragraphs and code with their item", () => {
      expect(clean("-   para\n\n    second")).toBe("- para\n\n  second\n");
      expect(clean("-   a\n\n    ```\n    code\n    ```")).toBe("- a\n\n  ```\n  code\n  ```\n");
    });
  });

  describe("code and front matter", () => {
    it("never changes fenced code", () => {
      const code = "```\n*  x   \n#y\n<span>z</span>\n```\n";
      expect(clean(code)).toBe(code);
    });

    it("never changes indented code", () => {
      expect(clean("Text\n\n    * not a list   \n    #nor a heading")).toBe("Text\n\n    * not a list   \n    #nor a heading\n");
    });

    it("keeps front matter and fixes what follows", () => {
      expect(clean("---\ntitle: x\n---\n#Two words")).toBe("---\ntitle: x\n---\n\n# Two words\n");
    });

    it("closes an unclosed fence", () => {
      expect(clean("```js\ncode")).toBe("```js\ncode\n```\n");
      expect(fixes("```js\ncode")).toEqual({ fence: 1 });
    });
  });

  describe("inline HTML", () => {
    it("unwraps styling tags but not inside inline code", () => {
      expect(clean('Use `<span>` and <span style="x">y</span>')).toBe("Use `<span>` and y\n");
      expect(fixes('Use `<span>` and <span style="x">y</span>')).toEqual({ "inline-html": 2 });
    });

    it("turns b and i into emphasis and drops style attributes", () => {
      expect(clean("<b>bold</b> <i>it</i>")).toBe("**bold** *it*\n");
      expect(clean('<div style="color:red" class="n">x</div>')).toBe('<div class="n">x</div>\n');
    });
  });

  describe("whitespace", () => {
    it("removes trailing spaces but keeps a hard break before more text", () => {
      expect(clean("a  \nb")).toBe("a  \nb\n");
      expect(clean("a   \n\nb\t")).toBe("a\n\nb\n");
    });

    it("collapses blank lines", () => {
      expect(clean("a\n\n\n\nb")).toBe("a\n\nb\n");
      expect(fixes("a\n\n\n\nb")).toEqual({ "blank-lines": 2 });
    });

    it("normalizes line endings and invisible characters", () => {
      expect(clean("a\r\nb c​")).toBe("a\nb c\n");
      expect(fixes("a\r\nb c​")).toEqual({ "line-endings": 1, invisible: 2 });
    });
  });

  it("aligns tables", () => {
    const result = cleanMarkdown("Intro\n|a|b|\n|-|-|\n|1|2|\nAfter");
    expect(result.markdown).toBe("Intro\n\n| a   | b   |\n| :-- | :-- |\n| 1   | 2   |\n\nAfter\n");
    expect(result.fixes.map((fix) => fix.id)).toContain("table");
  });

  it("is idempotent: its own output is already clean", () => {
    for (const example of [CLEANER_EXAMPLES[0].text, "1) a\n   * b\n\n     more\n2) c\n\n```\nx\n```"]) {
      const once = clean(example);
      const again = cleanMarkdown(once);
      expect(again.markdown).toBe(once);
      expect(again.fixes).toEqual([]);
    }
  });
});
