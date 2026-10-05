import { describe, expect, it } from "vitest";
import { splitTemplate } from "./template-frontmatter";
import { lintTemplate } from "./template-lint";
import { TEMPLATE_STARTER } from "./template-starter";
import { expandTemplate, extractPromptLabels } from "./template-tokens";

describe("TEMPLATE_STARTER", () => {
  it("has no routing and no frontmatter once used", () => {
    const { routing, content } = splitTemplate(TEMPLATE_STARTER);
    expect(routing).toEqual({});
    expect(content.startsWith("# {{title}}\n")).toBe(true);
  });

  it("points to the field menu in a comment that never reaches the note", () => {
    expect(TEMPLATE_STARTER).toContain("# Add a field: type /field");
    expect(splitTemplate(TEMPLATE_STARTER).content).not.toContain("/field");
  });

  it("lints clean", () => {
    expect(lintTemplate(TEMPLATE_STARTER)).toEqual([]);
  });

  it("asks for Owner only", () => {
    expect(extractPromptLabels(splitTemplate(TEMPLATE_STARTER).content)).toEqual(["Owner"]);
  });

  it("expands to a note with one caret position", () => {
    const { content } = splitTemplate(TEMPLATE_STARTER);
    const expanded = expandTemplate(content, {
      now: new Date(2026, 9, 4, 9, 0),
      title: "Auth",
      clipboard: "",
      prompts: { Owner: "Ana" },
    });
    expect(expanded.text).toBe("# Auth\n\nDate: 2026-10-04\nOwner: Ana\n\n\n");
    expect(expanded.cursor).toBe("# Auth\n\nDate: 2026-10-04\nOwner: Ana\n\n".length);
  });
});
