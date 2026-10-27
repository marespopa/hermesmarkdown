// @vitest-environment node
import { describe, expect, it } from "vitest";
import { lintTemplate } from "./template-lint";
import { BUILTIN_FOLDER_TEMPLATES } from "./template-folders";
import { builtinNoteTemplates, STARTER_TEMPLATES } from "./template-packs";
import { expandTemplate } from "./template-tokens";

const ctx = { now: new Date(2026, 9, 12, 9, 0), title: "", clipboard: "", prompts: {} };
const examples = [...STARTER_TEMPLATES.map((t) => ({ name: t.name, body: t.body! })), ...BUILTIN_FOLDER_TEMPLATES.flatMap((p) => p.templates)];

describe("built-in examples", () => {
  it("are a couple of notes and a couple of folders", () => {
    expect(STARTER_TEMPLATES.map((t) => t.name)).toEqual(["Meeting notes", "Project brief"]);
    expect(BUILTIN_FOLDER_TEMPLATES.map((p) => p.displayName)).toEqual(["Project folder", "Research folder"]);
  });

  it("have unique ids and names that make valid file names", () => {
    const ids = [...STARTER_TEMPLATES.map((t) => t.path), ...BUILTIN_FOLDER_TEMPLATES.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of STARTER_TEMPLATES) expect(t.name).not.toMatch(/[\\/:*?"<>|]/);
  });

  it("ship templates the linter has nothing to say about", () => {
    for (const template of examples) expect(lintTemplate(template.body), template.name).toEqual([]);
  });

  it("ship no file_name or target_folder: a template only gives a note its text", () => {
    for (const template of examples) expect(template.body).not.toMatch(/^(file_name|target_folder):/m);
  });

  it("ask for the attendees of a meeting and the owner of a project brief", () => {
    const find = (name: string) => STARTER_TEMPLATES.find((t) => t.name === name)!.body!;
    expect(expandTemplate(find("Meeting notes"), { ...ctx, prompts: { Attendees: "Design team" } }).text).toContain("attendees: Design team");
    expect(expandTemplate(find("Project brief"), { ...ctx, prompts: { Owner: "Growth" } }).text).toContain("owner: Growth");
  });
});

describe("builtinNoteTemplates", () => {
  it("lists the starters under Built-in, from memory, minus names the vault already has", () => {
    const listed = builtinNoteTemplates([{ name: "meeting NOTES", path: "_templates/Meeting notes.md" }]);
    expect(listed.map((t) => t.name)).toEqual(["Project brief"]);
    expect(listed.every((t) => t.pack === "Built-in" && t.body && t.path.startsWith("builtin:"))).toBe(true);
  });
});
