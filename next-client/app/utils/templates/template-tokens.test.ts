import { describe, expect, it } from "vitest";
import {
  expandTemplate,
  extractPromptLabels,
  offsetToLineColumn,
  slugify,
  usesToken,
  type TemplateContext,
} from "./template-tokens";

// Sunday, 4 October 2026, 09:05 local time.
const NOW = new Date(2026, 9, 4, 9, 5);

function ctx(overrides: Partial<TemplateContext> = {}): TemplateContext {
  return { now: NOW, title: "Auth Spec", clipboard: "", prompts: {}, ...overrides };
}

describe("expandTemplate", () => {
  it("expands every temporal token with zero-padding and English names", () => {
    const { text } = expandTemplate(
      "{{date}} {{time}} {{weekday}} {{year}}/{{month}}/{{day}} {{monthName}}",
      ctx(),
    );
    expect(text).toBe("2026-10-04 09:05 Sunday 2026/10/04 October");
  });

  it("allows whitespace inside the braces", () => {
    expect(expandTemplate("{{ date }}|{{  title }}", ctx()).text).toBe("2026-10-04|Auth Spec");
  });

  it("expands title, slug and clipboard", () => {
    expect(expandTemplate("# {{title}} {{slug}} {{clipboard}}", ctx({ clipboard: "pasted" })).text)
      .toBe("# Auth Spec auth-spec pasted");
  });

  it("keeps unknown tokens and unanswered prompts literal", () => {
    expect(expandTemplate("{{foo}} {{Date}} {{prompt:Missing}}", ctx()).text)
      .toBe("{{foo}} {{Date}} {{prompt:Missing}}");
  });

  it("replaces every occurrence of a prompt label with its answer", () => {
    const { text } = expandTemplate("{{prompt:Owner}} / {{ prompt: Owner }}", ctx({ prompts: { Owner: "Ana" } }));
    expect(text).toBe("Ana / Ana");
  });

  it("never expands text a token inserted (single pass)", () => {
    const { text } = expandTemplate(
      "{{prompt:Owner}} {{clipboard}}",
      ctx({ prompts: { Owner: "{{date}}" }, clipboard: "{{title}}" }),
    );
    expect(text).toBe("{{date}} {{title}}");
  });

  it("records the first cursor and removes the rest", () => {
    const result = expandTemplate("# {{title}}\n{{cursor}}rest{{cursor}}", ctx());
    expect(result.text).toBe("# Auth Spec\nrest");
    expect(result.cursor).toBe("# Auth Spec\n".length);
  });

  it("gives a null cursor when there is none", () => {
    expect(expandTemplate("plain", ctx()).cursor).toBeNull();
  });
});

describe("slugify", () => {
  it("removes accents and collapses punctuation runs", () => {
    expect(slugify("Café Déjà-vu!!  Notes")).toBe("cafe-deja-vu-notes");
    expect(slugify("C++ & Go")).toBe("c-go");
    expect(slugify("--Hello--")).toBe("hello");
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});

describe("extractPromptLabels", () => {
  it("returns distinct trimmed labels in first-appearance order, keeping case", () => {
    expect(extractPromptLabels("{{prompt: Owner }} {{prompt:Due}} {{prompt:Owner}} {{prompt:owner}} {{prompt:}}"))
      .toEqual(["Owner", "Due", "owner"]);
  });
});

describe("usesToken", () => {
  it("detects a token, with or without spaces", () => {
    expect(usesToken("a {{ clipboard }} b", "clipboard")).toBe(true);
    expect(usesToken("a {{date}} b", "clipboard")).toBe(false);
  });
});

describe("offsetToLineColumn", () => {
  it("gives a 1-based line and 0-based column", () => {
    expect(offsetToLineColumn("ab\ncd\nef", 0)).toEqual({ line: 1, column: 0 });
    expect(offsetToLineColumn("ab\ncd\nef", 4)).toEqual({ line: 2, column: 1 });
    expect(offsetToLineColumn("ab\ncd\n", 6)).toEqual({ line: 3, column: 0 });
  });
});
