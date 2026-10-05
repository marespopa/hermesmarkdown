import { describe, expect, it } from "vitest";
import { splitTemplate } from "./template-frontmatter";
import { lintTemplate } from "./template-lint";
import { TEMPLATE_STARTER, TEMPLATE_STARTERS } from "./template-starter";
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

describe("TEMPLATE_STARTERS", () => {
  it("starts with Basic, the default starter", () => {
    expect(TEMPLATE_STARTERS[0]).toMatchObject({ name: "Basic", suggestedName: "", body: TEMPLATE_STARTER });
  });

  it.each(TEMPLATE_STARTERS.map((s) => [s.name, s.body]))("%s lints clean and keeps hints out of notes", (_name, body) => {
    expect(lintTemplate(body)).toEqual([]);
    const { routing, content } = splitTemplate(body);
    expect(routing).toEqual({});
    expect(content).not.toContain("/field");
    expect(content).toContain("# {{title}}");
  });

  it("asks the Spec author once and copies its metadata into notes", () => {
    const spec = TEMPLATE_STARTERS.find((s) => s.name === "Spec")!;
    const { content } = splitTemplate(spec.body);
    expect(extractPromptLabels(content)).toEqual(["Author"]);
    expect(content).toMatch(/^---\nauthor: \{\{prompt:Author\}\}\nstatus: Draft\n/);
  });
});
