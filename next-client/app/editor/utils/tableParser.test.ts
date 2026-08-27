import { describe, expect, it } from "vitest";
import { extractTableSource, parseTable, parseTableLenient } from "./tableParser";

describe("parseTable", () => {
  it("parses aligned cells and preserves escaped pipes", () => {
    const table = parseTable([
      "| Name | Notes | Status |",
      "| :--- | :---: | ---: |",
      "| Ada | Uses \\| in text | ready |",
    ].join("\n"));

    expect(table).toEqual({
      headers: ["Name", "Notes", "Status"],
      rows: [["Ada", "Uses \\| in text", "ready"]],
      alignments: ["left", "center", "right"],
    });
  });

  it("pads short rows, truncates long rows, and skips separator rows", () => {
    const table = parseTable([
      "A | B",
      "--- | ---",
      "| 1 |",
      "--- | ---",
      "2 | 3 | extra",
    ].join("\n"));

    expect(table?.rows).toEqual([["1", ""], ["2", "3"]]);
  });

  it("rejects tables without a valid separator row", () => {
    expect(parseTable("| A | B |\n| not a separator |\n| 1 | 2 |")).toBeNull();
    expect(parseTable("plain text")).toBeNull();
  });
});

describe("parseTableLenient", () => {
  it("uses the first row as headers when the separator is invalid", () => {
    expect(parseTableLenient("| A | B |\n| 1 |\n| 2 | 3 | 4 |")).toEqual({
      headers: ["A", "B"],
      rows: [["1", ""], ["2", "3"]],
      alignments: ["left", "left"],
    });
  });

  it("returns null when there are no pipe-containing lines", () => {
    expect(parseTableLenient("not a table")).toBeNull();
  });
});

describe("extractTableSource", () => {
  it("extracts an inclusive range of lines", () => {
    expect(extractTableSource(["before", "| A |", "| - |", "after"], 1, 2)).toBe("| A |\n| - |");
  });
});