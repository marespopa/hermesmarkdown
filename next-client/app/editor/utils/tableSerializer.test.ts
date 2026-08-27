import { describe, expect, it } from "vitest";
import { parseTable } from "./tableParser";
import { serializeTable } from "./tableSerializer";

const data = {
  headers: ["Name", "Age"],
  rows: [["Ada", "36"], ["Lin", "8"]],
  alignments: ["left", "right"] as const,
};

describe("serializeTable", () => {
  it("serializes a compact table with alignment markers", () => {
    expect(serializeTable(data, false)).toBe("| Name | Age |\n| :-- | --: |\n| Ada | 36 |\n| Lin | 8 |");
  });

  it("pads pretty output according to column width and alignment", () => {
    expect(serializeTable(data)).toBe(
      "| Name | Age |\n| :--- | --: |\n| Ada  |  36 |\n| Lin  |   8 |",
    );
  });

  it("round trips through the strict table parser", () => {
    const serialized = serializeTable({
      headers: ["A", "B", "C"],
      rows: [["one", "two", "three"]],
      alignments: ["left", "center", "right"],
    });

    expect(parseTable(serialized)).toEqual({
      headers: ["A", "B", "C"],
      rows: [["one", "two", "three"]],
      alignments: ["left", "center", "right"],
    });
  });
});