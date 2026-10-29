import { describe, expect, it } from "vitest";
import { parseSkillDocument, serializeSkillDocument } from "./skill-frontmatter";

describe("skill frontmatter", () => {
  it("normalizes known allowlisted metadata and preserves ordinary body text", async () => {
    const parsed = await parseSkillDocument("---\ntype: skill\ndescription: Check code\nowner: team\ntools: [read_file, check_file]\nchecks: [typecheck]\n---\nUse the literal string `$(not code)` in examples.");
    expect(parsed.description).toBe("Check code");
    expect(parsed.toolBindings).toEqual(["read_file", "check_file"]);
    expect(parsed.projectChecks).toEqual(["typecheck"]);
    expect(parsed.body).toContain("$(not code)");
    expect(parsed.errors).toEqual([]);
  });

  it("reports malformed YAML, unknown, duplicate and disallowed values", async () => {
    expect((await parseSkillDocument("---\ntype: [\n---\nbody")).errors[0]).toContain("not valid YAML");
    const parsed = await parseSkillDocument("---\ntype: skill\ntools: [read_file, read_file, edit_file, shell]\nchecks: [deploy]\n---\ntext");
    expect(parsed.toolBindings).toEqual(["read_file"]);
    expect(parsed.projectChecks).toEqual([]);
    expect(parsed.errors).toEqual(expect.arrayContaining([
      "Duplicate tool binding: read_file.", "Unknown or disallowed tool: edit_file.",
      "Unknown or disallowed tool: shell.", "Unknown or disallowed check: deploy.",
    ]));
  });

  it("reports missing values and never evaluates a body as code", async () => {
    const parsed = await parseSkillDocument("---\ntype: skill\ntools: shell\nchecks: 4\n---\nimport alert from x;");
    expect(parsed.errors).toEqual(expect.arrayContaining(["tool bindings must be a list.", "check bindings must be a list."]));
    expect(parsed.body).toBe("import alert from x;");
  });

  it("keeps unrelated frontmatter when serializing an edit", async () => {
    const parsed = await parseSkillDocument("---\ntype: skill\nowner: team\ncolor: moss\n---\nold");
    const saved = await serializeSkillDocument({ name: "Review", description: "", body: "Read before editing.", toolBindings: [], projectChecks: [], frontmatter: parsed.frontmatter });
    expect(saved).toContain("owner: team");
    expect(saved).toContain("color: moss");
    expect(saved).toContain("type: skill");
    expect(saved).toContain("Read before editing.");
    expect(saved).not.toContain("old");
  });
});
