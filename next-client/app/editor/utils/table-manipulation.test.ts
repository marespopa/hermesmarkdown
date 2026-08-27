import { describe, expect, it } from "vitest";
import {
  addColumn,
  addRow,
  cycleAlignment,
  delimitedTextToMarkdownTable,
  detectDelimitedTable,
  getColumnAlignment,
  insertColumnAt,
  insertRowAt,
  removeColumn,
  removeRow,
  tableToCSV,
} from "./table-manipulation";

const table = ["| Name | Age |", "| ---- | --- |", "| Ada | 36 |", "| Lin | 28 |"];

describe("table row and column manipulation", () => {
  it("adds and inserts empty rows without mutating the input", () => {
    expect(addRow(table, 3)).toEqual([...table, "|        |        |"]);
    expect(insertRowAt(table, 1)).toEqual([table[0], table[1], "|        |        |", table[2], table[3]]);
    expect(table).toEqual(["| Name | Age |", "| ---- | --- |", "| Ada | 36 |", "| Lin | 28 |"]);
  });

  it("adds and inserts empty columns across a table", () => {
    expect(addColumn(table, 0, 3)).toEqual([
      "| Name | Age |          |",
      "| ---- | --- | -------- |",
      "| Ada | 36 |          |",
      "| Lin | 28 |          |",
    ]);
    expect(insertColumnAt(table, 0, 0, 3)).toEqual([
      "| Name   |        | Age    |",
      "| -------- |  --------  | -------- |",
      "| Ada    |        | 36     |",
      "| Lin    |        | 28     |",
    ]);
  });

  it("protects header and separator rows and removes data rows or columns", () => {
    expect(removeRow(table, 0, 0)).toBe(table);
    expect(removeRow(table, 1, 0)).toBe(table);
    expect(removeRow(table, 2, 0)).toEqual([table[0], table[1], table[3]]);
    expect(removeColumn(table, 0, 0, 3)).toEqual([
      "| Age    |",
      "| -------- |",
      "| 36     |",
      "| 28     |",
    ]);
  });
});

describe("table alignment", () => {
  it("cycles alignment and reports the current alignment", () => {
    expect(getColumnAlignment(table, 0, 0)).toBe("none");
    const left = cycleAlignment(table, 0, 0);
    expect(left.newAlignment).toBe("left");
    expect(getColumnAlignment(left.lines, 0, 0)).toBe("left");
    const center = cycleAlignment(left.lines, 0, 0);
    expect(center.newAlignment).toBe("center");
    expect(center.lines[1]).toContain(":------:");
  });
});

describe("table export and delimited input", () => {
  it("exports table data as CSV and quotes special cells", () => {
    expect(tableToCSV(["| Name | Notes |", "| --- | --- |", '| Ada | says, "hi" |'], 0, 2))
      .toBe('Name,Notes\nAda,"says, ""hi"""');
  });

  it("detects consistent CSV and TSV input but rejects ambiguous text", () => {
    expect(detectDelimitedTable("a,b\n1,2")).toBe(",");
    expect(detectDelimitedTable("a\tb\n1\t2")).toBe("\t");
    expect(detectDelimitedTable("a,b\n1,2,3")).toBeNull();
    expect(detectDelimitedTable("just one line")).toBeNull();
  });

  it("converts delimited text to a padded Markdown table", () => {
    expect(delimitedTextToMarkdownTable("Name,Age\nAda,36", ",")).toBe(
      "| Name   | Age    |\n| -------- | -------- |\n| Ada    | 36     |",
    );
  });
});