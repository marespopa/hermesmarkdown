// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateTable } from "@/app/editor/utils/formula-engine";
import { findAllTables } from "@/app/editor/utils/table-detection";
import { parseTable, type TableData } from "@/app/editor/utils/tableParser";
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

// Every table in a note by its heading (null for one without), and each
// formula cell's display, as the editor computes it.
function computeNote(text: string) {
  const tables = findAllTables(text).map((block) => ({
    heading: block.heading,
    data: parseTable(block.lines.slice(block.tableStart, block.tableEnd + 1).join("\n"))!,
  }));
  const named = new Map<string, TableData>(tables.filter((t) => t.heading).map((t) => [t.heading!, t.data]));
  return tables.map(({ heading, data }) => {
    const results = evaluateTable(data, named);
    return { heading, data, display: (row: number, col: number) => results.get(`${row}_${col}`)?.display };
  });
}

describe("Finance pack", () => {
  const finance = (name: string) =>
    BUILTIN_PACKS.find((p) => p.name === "Finance")!.templates.find((t) => t.name === name)!;
  const fill = (text: string, from: string, to: string) => text.replace(from, to);

  it("totals a monthly budget by table name, so new rows need no formula change", () => {
    let text = expandTemplate(finance("Monthly budget").body, ctx).text;
    text = fill(text, "| Salary | 0 |", "| Salary | 4000 |");
    text = fill(text, "| Rent | 0 |", "| Rent | 1200 |\n| Gym | 100 |");
    const summary = computeNote(text).find((t) => t.heading === "Summary")!;
    expect([summary.display(2, 1), summary.display(3, 1), summary.display(4, 1)]).toEqual(["4000", "1300", "2700"]);
  });

  it("computes every formula of every finance template without an error", () => {
    for (const template of BUILTIN_PACKS.find((p) => p.name === "Finance")!.templates) {
      const tables = computeNote(expandTemplate(template.body, ctx).text);
      expect(tables.length, template.name).toBeGreaterThan(0);
      for (const { data, display } of tables) {
        data.rows.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell.startsWith("=")) expect(display(r + 2, c), `${template.name} ${cell}`).toMatch(/^-?\d/);
          }),
        );
      }
    }
  });

  it("adds up subscriptions per year", () => {
    const text = fill(expandTemplate(finance("Subscriptions").body, ctx).text, "| Streaming | 0 |", "| Streaming | 15 |");
    const [table] = computeNote(text);
    expect([table.display(2, 2), table.display(4, 1), table.display(4, 2)]).toEqual(["180", "15", "180"]);
  });
});

describe("packTemplatesInVault", () => {
  it("finds the pack's templates already in the vault, ignoring case", () => {
    const meetings = BUILTIN_PACKS.find((pack) => pack.name === "Meetings")!;
    const paths = ["templates/meetings/standup.md", "templates/Meetings/Meeting notes.md", "templates/One-on-one.md"];
    expect([...packTemplatesInVault(meetings, "templates", paths)].sort()).toEqual(["Meeting notes", "Standup"]);
  });
});
