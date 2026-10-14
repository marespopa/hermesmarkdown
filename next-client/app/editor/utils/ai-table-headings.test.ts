import { describe, expect, it } from "vitest";
import { keepTablesUnderHeadings } from "./ai-table-headings";
import { TABLE_NAME_EXAMPLE } from "./formula-ai-guide";
import { findAllTables } from "./table-detection";

const TABLE = "| Source | Amount |\n|---|---|\n| Salary | 4000 |";

describe("keepTablesUnderHeadings", () => {
  it("moves a description between a heading and its table to below the table", () => {
    expect(keepTablesUnderHeadings(TABLE_NAME_EXAMPLE.wrong)).toBe(TABLE_NAME_EXAMPLE.right);
    expect(findAllTables(keepTablesUnderHeadings(TABLE_NAME_EXAMPLE.wrong))[0].heading).toBe("Income");
  });

  it("handles a description right under the heading and text right after the table", () => {
    const input = `## Income\nMonthly income before tax.\n\n${TABLE}\nNext section.`;
    expect(keepTablesUnderHeadings(input)).toBe(`## Income\n\n${TABLE}\n\nMonthly income before tax.\n\nNext section.`);
  });

  it("moves a list or a callout the same way, for every table in the text", () => {
    const input = `## Income\n\n- before tax\n- monthly\n\n${TABLE}\n\n## Costs\n\n> [!note] Estimates.\n\n${TABLE}`;
    expect(keepTablesUnderHeadings(input)).toBe(
      `## Income\n\n${TABLE}\n\n- before tax\n- monthly\n\n## Costs\n\n${TABLE}\n\n> [!note] Estimates.`,
    );
  });

  it("leaves tables already under their heading, prose sections and tables without a heading alone", () => {
    const prose = `## Income\n\nFirst paragraph.\n\nSecond paragraph.\n\n${TABLE}`;
    const unnamed = `Some intro.\n\n${TABLE}`;
    for (const text of [TABLE_NAME_EXAMPLE.right, prose, unnamed]) {
      expect(keepTablesUnderHeadings(text)).toBe(text);
    }
  });

  it("doesn't touch tables or headings inside code fences", () => {
    const fenced = "```md\n## Income\n\nA description.\n\n| A | B |\n|---|---|\n```";
    expect(keepTablesUnderHeadings(fenced)).toBe(fenced);
  });
});
