// @vitest-environment node
import { describe, expect, it } from "vitest";
import { namesItsNote } from "@/app/hooks/file-system/use-template-create";
import { splitTemplate } from "./template-frontmatter";
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

  it("names the Journal's dated notes by period, in journal/<year>", () => {
    const journal = BUILTIN_PACKS.find((pack) => pack.name === "Journal")!;
    const routed = (name: string) => {
      const { routing } = splitTemplate(journal.templates.find((t) => t.name === name)!.body);
      expect(namesItsNote(routing.fileName)).toBe(true);
      return [expandTemplate(routing.targetFolder!, ctx).text, expandTemplate(routing.fileName!, ctx).text];
    };
    expect(routed("Daily")).toEqual(["journal/2026", "2026-10-12"]);
    expect(routed("Weekly")).toEqual(["journal/2026", "2026-W42"]);
    expect(routed("Monthly")).toEqual(["journal/2026", "2026-10"]);
    expect(routed("Yearly")).toEqual(["journal/2026", "2026-year"]);
  });
});

describe("packTemplatesInVault", () => {
  it("finds the pack's templates already in the vault, ignoring case", () => {
    const meetings = BUILTIN_PACKS.find((pack) => pack.name === "Meetings")!;
    const paths = ["templates/meetings/standup.md", "templates/Meetings/Meeting notes.md", "templates/One-on-one.md"];
    expect([...packTemplatesInVault(meetings, "templates", paths)].sort()).toEqual(["Meeting notes", "Standup"]);
  });
});
