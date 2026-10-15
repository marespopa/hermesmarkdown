// @vitest-environment node
import { describe, expect, it } from "vitest";
import { lintTemplate } from "./template-lint";
import { BUILTIN_PACKS, packTemplatesInVault } from "./template-packs";
import { expandTemplate } from "./template-tokens";

const ctx = { now: new Date(2026, 9, 12, 9, 0), title: "", clipboard: "", prompts: {} };

describe("BUILTIN_PACKS", () => {
  it("has unique pack names and template names that make valid file names", () => {
    const names = BUILTIN_PACKS.map((pack) => pack.name);
    expect(new Set(names).size).toBe(names.length);
    for (const pack of BUILTIN_PACKS) {
      const templateNames = pack.templates.map((t) => t.name.toLowerCase());
      expect(new Set(templateNames).size).toBe(templateNames.length);
      for (const template of pack.templates) expect(template.name).not.toMatch(/[\\/:*?"<>|]/);
    }
  });

  it("ships templates the linter has nothing to say about", () => {
    for (const pack of BUILTIN_PACKS) {
      for (const template of pack.templates) expect(lintTemplate(template.body), `${pack.name}/${template.name}`).toEqual([]);
    }
  });

  it("ships no file_name or target_folder: a template only gives a note its text", () => {
    for (const pack of BUILTIN_PACKS) {
      for (const template of pack.templates) expect(template.body).not.toMatch(/^(file_name|target_folder):/m);
    }
  });

  it("links the Journal's weekly note to last week's by date", () => {
    const weekly = BUILTIN_PACKS.find((pack) => pack.name === "Journal")!.templates.find((t) => t.name === "Weekly")!;
    expect(expandTemplate(weekly.body, ctx).text).toContain("Last week: [[2026-W41]]");
  });

  it("asks for the owner of a PRD and the author of a book note", () => {
    const find = (pack: string, name: string) =>
      BUILTIN_PACKS.find((p) => p.name === pack)!.templates.find((t) => t.name === name)!;
    expect(expandTemplate(find("Projects", "PRD").body, { ...ctx, prompts: { Owner: "Growth" } }).text).toContain("owner: Growth");
    expect(expandTemplate(find("Writing", "Book note").body, { ...ctx, prompts: { Author: "Unknown" } }).text).toContain("author: Unknown");
  });
});

describe("packTemplatesInVault", () => {
  it("finds the pack's templates already in the vault, ignoring case", () => {
    const meetings = BUILTIN_PACKS.find((pack) => pack.name === "Meetings")!;
    const paths = ["templates/meetings/standup.md", "templates/Meetings/Meeting notes.md", "templates/One-on-one.md"];
    expect([...packTemplatesInVault(meetings, "templates", paths)].sort()).toEqual(["Meeting notes", "Standup"]);
  });
});
