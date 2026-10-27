import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { applyEdits, repairFrontmatter, replaceCodeBlock, withNewNoteFrontmatter } from "./edit-tools";

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

describe("withNewNoteFrontmatter", () => {
  it("adds a title and created date to a note without frontmatter", () => {
    expect(withNewNoteFrontmatter("Projects/Launch plan.md", "# Launch\n", "2026-10-27"))
      .toBe('---\ntitle: Launch plan\ncreated: 2026-10-27\n---\n\n# Launch\n');
  });

  it("adds only the missing fields to frontmatter the model wrote", () => {
    expect(withNewNoteFrontmatter("Roadmap.md", "---\ntitle: Q4 roadmap\ntags: [plan]\n---\nBody\n", "2026-10-27"))
      .toBe('---\ntitle: Q4 roadmap\ntags: [plan]\ncreated: 2026-10-27\n---\nBody\n');
  });

  it("leaves complete frontmatter as written", () => {
    const text = "---\ntitle: Roadmap\ncreated: 2026-01-02\n---\nBody\n";
    expect(withNewNoteFrontmatter("Roadmap.md", text, "2026-10-27")).toBe(text);
  });

  it("quotes a title only when YAML would misread it", () => {
    expect(withNewNoteFrontmatter("Q4: plan.md", "", "2026-10-27")).toContain('title: "Q4: plan"\n');
    expect(withNewNoteFrontmatter("[Draft] Pricing.md", "", "2026-10-27")).toContain('title: "[Draft] Pricing"\n');
    expect(withNewNoteFrontmatter("2026.md", "", "2026-10-27")).toContain('title: "2026"\n');
    expect(withNewNoteFrontmatter("Yes.md", "", "2026-10-27")).toContain('title: "Yes"\n');
    expect(withNewNoteFrontmatter("Release #2.md", "", "2026-10-27")).toContain('title: "Release #2"\n');
    expect(withNewNoteFrontmatter("C# notes.md", "", "2026-10-27")).toContain("title: C# notes\n");
  });

  it("gives an empty note just the frontmatter", () => {
    expect(withNewNoteFrontmatter("Inbox.md", "", "2026-10-27")).toBe('---\ntitle: Inbox\ncreated: 2026-10-27\n---\n\n');
  });
});

describe("repairFrontmatter", () => {
  const yaml = (source: string) => load(source);

  it("quotes a value YAML misreads, keeping it as written", () => {
    const text = "---\ntitle: Frontmatter editing: richer summaries, safer parsing\ntags: [plan, frontmatter]\nstatus: in-progress\n---\nBody\n";
    expect(repairFrontmatter(text, yaml)).toBe('---\ntitle: "Frontmatter editing: richer summaries, safer parsing"\ntags: [plan, frontmatter]\nstatus: in-progress\n---\nBody\n');
  });

  it("quotes a value that starts with a quoted word", () => {
    const repaired = repairFrontmatter('---\ntitle: "Q4" plan\n---\n', yaml);
    expect(load(repaired.split("---\n")[1])).toEqual({ title: '"Q4" plan' });
  });

  it("leaves valid frontmatter, template fields and what quoting can't fix alone", () => {
    const valid = "---\ntitle: Roadmap\ntags: [plan]\n---\nBody\n";
    expect(repairFrontmatter(valid, yaml)).toBe(valid);
    const template = "---\ntitle: {{title}}\n---\n";
    expect(repairFrontmatter(template, yaml)).toBe(template);
    const broken = "---\ntitle: A\n\tcreated: x\n---\n";
    expect(repairFrontmatter(broken, yaml)).toBe(broken);
  });
});

