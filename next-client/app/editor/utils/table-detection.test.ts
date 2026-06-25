import { describe, it, expect } from "vitest";
import { findAllTables } from "./table-detection";

describe("findAllTables", () => {
  it("finds a single table block", () => {
    const text = ["intro", "| A | B |", "| - | - |", "| 1 | 2 |", "outro"].join("\n");
    const blocks = findAllTables(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].tableStart).toBe(1);
    expect(blocks[0].tableEnd).toBe(3);
    expect(blocks[0].tableStartOffset).toBe(text.indexOf("| A | B |"));
  });

  it("finds multiple tables anywhere in the document, not just near a cursor", () => {
    const text = [
      "# Doc",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "some text in between",
      "",
      "| X | Y |",
      "| - | - |",
      "| 3 | 4 |",
    ].join("\n");
    const blocks = findAllTables(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].tableStart).toBe(1);
    expect(blocks[1].tableStart).toBe(7);
  });

  it("returns an empty array when there are no tables", () => {
    expect(findAllTables("just some\nplain text")).toEqual([]);
  });
});
