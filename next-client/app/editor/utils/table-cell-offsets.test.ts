import { describe, it, expect } from "vitest";
import { findTableAtPos } from "./table-detection";
import { getTableCellOffsets } from "./table-cell-offsets";

describe("getTableCellOffsets", () => {
  it("computes absolute offsets that round-trip against the source text", () => {
    const text = [
      "intro line",
      "| Item | Amount |",
      "| ---- | ------ |",
      "| Rent | $2,000 |",
      "| Food | $400   |",
    ].join("\n");

    const tableInfo = findTableAtPos(text, text.indexOf("Rent"));
    expect(tableInfo).not.toBeNull();

    const offsets = getTableCellOffsets(tableInfo!);

    // Header row (A1 row 1)
    const header0 = offsets.find((c) => c.row === 1 && c.col === 0)!;
    expect(text.slice(header0.start, header0.end)).toBe("Item");

    // First data row (A1 row 2) — separator consumed no row number
    const rent = offsets.find((c) => c.row === 2 && c.col === 0)!;
    expect(text.slice(rent.start, rent.end)).toBe("Rent");
    const rentAmount = offsets.find((c) => c.row === 2 && c.col === 1)!;
    expect(text.slice(rentAmount.start, rentAmount.end)).toBe("$2,000");

    // Second data row (A1 row 3)
    const food = offsets.find((c) => c.row === 3 && c.col === 0)!;
    expect(text.slice(food.start, food.end)).toBe("Food");
    const foodAmount = offsets.find((c) => c.row === 3 && c.col === 1)!;
    expect(text.slice(foodAmount.start, foodAmount.end)).toBe("$400");
    // fullStart/fullEnd include the padding up to the surrounding pipes —
    // "$400" is padded to "$400   " to match the widest cell in that column.
    expect(text.slice(foodAmount.fullStart, foodAmount.fullEnd)).toBe(" $400   ");
  });

  it("handles escaped pipes inside a cell without shifting offsets", () => {
    const text = ["| A | B |", "| - | - |", "| x\\|y | 5 |"].join("\n");
    const tableInfo = findTableAtPos(text, text.indexOf("5"));
    const offsets = getTableCellOffsets(tableInfo!);
    const cell = offsets.find((c) => c.row === 2 && c.col === 0)!;
    expect(text.slice(cell.start, cell.end)).toBe("x\\|y");
  });
});
