import { describe, it, expect } from "vitest";
import type { TableData } from "./tableParser";
import {
  colIndexToLetter,
  letterToColIndex,
  parseCellRef,
  parseRangeRef,
  isFormulaCell,
  parseAmount,
  evaluateTable,
  formatFormulaValue,
} from "./formula-engine";

function result(data: TableData, row: number, col: number): string {
  const r = evaluateTable(data).get(`${row}_${col}`);
  return r ? r.display : "";
}

describe("A1 addressing", () => {
  it("round-trips column letters", () => {
    expect(colIndexToLetter(0)).toBe("A");
    expect(colIndexToLetter(1)).toBe("B");
    expect(colIndexToLetter(25)).toBe("Z");
    expect(colIndexToLetter(26)).toBe("AA");
    expect(letterToColIndex("A")).toBe(0);
    expect(letterToColIndex("B")).toBe(1);
    expect(letterToColIndex("Z")).toBe(25);
    expect(letterToColIndex("AA")).toBe(26);
  });

  it("parses cell refs", () => {
    expect(parseCellRef("B2")).toEqual({ row: 2, col: 1 });
    expect(parseCellRef("not-a-ref")).toBeNull();
  });

  it("parses and normalizes range refs", () => {
    expect(parseRangeRef("B2:D2")).toEqual({ startRow: 2, endRow: 2, startCol: 1, endCol: 3 });
    expect(parseRangeRef("D2:B2")).toEqual({ startRow: 2, endRow: 2, startCol: 1, endCol: 3 });
    expect(parseRangeRef("nope")).toBeNull();
  });
});

describe("isFormulaCell", () => {
  it("detects formulas", () => {
    expect(isFormulaCell("=SUM(B2:D2)")).toBe(true);
    expect(isFormulaCell("  =1+1")).toBe(true);
    expect(isFormulaCell("=")).toBe(false);
    expect(isFormulaCell("200")).toBe(false);
  });
});

describe("parseAmount (currency-agnostic)", () => {
  it("parses plain numbers", () => {
    expect(parseAmount("200")).toBe(200);
    expect(parseAmount("3.5")).toBe(3.5);
    expect(parseAmount("-10")).toBe(-10);
  });

  it("ignores currency placement and spacing", () => {
    expect(parseAmount("$1000")).toBe(1000);
    expect(parseAmount("1000$")).toBe(1000);
    expect(parseAmount("1000 RON")).toBe(1000);
    expect(parseAmount("1000RON")).toBe(1000);
    expect(parseAmount("$2,000")).toBe(2000);
  });

  it("returns null for non-numeric text", () => {
    expect(parseAmount("Rent")).toBeNull();
  });
});

describe("evaluateTable — arithmetic & cell refs", () => {
  it("sums a row range", () => {
    const data: TableData = {
      headers: ["Item", "B", "C", "D"],
      rows: [["Costs", "200", "3.5", "-10"]],
      alignments: ["left", "left", "left", "left"],
    };
    // Reference B2:D2 from a formula placed in column A of the same row.
    data.rows[0][0] = "=SUM(B2:D2)";
    expect(result(data, 2, 0)).toBe("193.5");
  });

  it("the bug-report case: plain numbers with no currency symbol", () => {
    const data: TableData = {
      headers: ["A", "B", "C", "D"],
      rows: [["=SUM(B2:D2)", "200", "3.5", "-10"]],
      alignments: ["left", "left", "left", "left"],
    };
    expect(result(data, 2, 0)).toBe("193.5");
  });

  it("supports basic arithmetic and parens", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=(2+3)*4-1"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("19");
  });

  it("coerces currency-tagged referenced cells and formats the result as currency", () => {
    const data: TableData = {
      headers: ["Item", "Amount"],
      rows: [
        ["Rent", "$2,000"],
        ["Food", "$400"],
        ["Total", "=SUM(B2:B3)"],
      ],
      alignments: ["left", "left"],
    };
    expect(result(data, 4, 1)).toBe("$2,400.00");
  });
});

describe("evaluateTable — currency formatting", () => {
  it("formats SUM/AVERAGE results as currency when the column is currency-tagged", () => {
    const data: TableData = {
      headers: ["Item", "Amount"],
      rows: [
        ["Rent", "1000 RON"],
        ["Food", "500 RON"],
        ["Total", "=SUM(B2:B3)"],
        ["Avg", "=AVERAGE(B2:B3)"],
      ],
      alignments: ["left", "left"],
    };
    expect(result(data, 4, 1)).toBe("1,500.00 RON");
    expect(result(data, 5, 1)).toBe("750.00 RON");
  });

  it("falls back to a plain number when the range mixes currencies", () => {
    const data: TableData = {
      headers: ["A", "B"],
      rows: [["$10", "20 RON"], ["=SUM(A2:B2)", ""]],
      alignments: ["left", "left"],
    };
    expect(result(data, 3, 0)).toBe("30");
  });

  it("does not format COUNT/COUNTA of a currency column as currency", () => {
    const data: TableData = {
      headers: ["Amount"],
      rows: [["$10"], ["$20"], ["=COUNT(A2:A3)"]],
      alignments: ["left"],
    };
    expect(result(data, 4, 0)).toBe("2");
  });

  it("propagates currency through a plain arithmetic expression on a referenced cell", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["$100"], ["=A2*2"]],
      alignments: ["left"],
    };
    expect(result(data, 3, 0)).toBe("$200.00");
  });

  it("propagates currency through a chain of formula references", () => {
    const data: TableData = {
      headers: ["A", "B"],
      rows: [["$50", "$60"], ["=SUM(A2:B2)", "=A3*2"]],
      alignments: ["left", "left"],
    };
    expect(result(data, 3, 0)).toBe("$110.00");
    expect(result(data, 3, 1)).toBe("$220.00");
  });
});

describe("evaluateTable — functions", () => {
  const base: TableData = {
    headers: ["A", "B", "C"],
    rows: [
      ["10", "20", "30"],
      ["", "", ""],
    ],
    alignments: ["left", "left", "left"],
  };

  function withFormula(formula: string): TableData {
    return {
      headers: [...base.headers],
      rows: base.rows.map((r) => [...r]),
      alignments: [...base.alignments],
    };
  }

  it("AVERAGE", () => {
    const data = withFormula("");
    data.rows[1][0] = "=AVERAGE(A2:C2)";
    expect(result(data, 3, 0)).toBe("20");
  });

  it("MIN / MAX", () => {
    const data = withFormula("");
    data.rows[1][0] = "=MIN(A2:C2)";
    data.rows[1][1] = "=MAX(A2:C2)";
    expect(result(data, 3, 0)).toBe("10");
    expect(result(data, 3, 1)).toBe("30");
  });

  it("COUNT / COUNTA", () => {
    const data: TableData = {
      headers: ["A", "B", "C"],
      rows: [["10", "", "x"], ["=COUNT(A2:C2)", "=COUNTA(A2:C2)", ""]],
      alignments: ["left", "left", "left"],
    };
    expect(result(data, 3, 0)).toBe("1");
    expect(result(data, 3, 1)).toBe("2");
  });

  it("ABS / ROUND", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=ABS(-5)"], ["=ROUND(3.456,2)"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("5");
    expect(result(data, 3, 0)).toBe("3.46");
  });

  it("IF / AND / OR / NOT", () => {
    const data: TableData = {
      headers: ["A", "B"],
      rows: [
        ["10", "5"],
        ["=IF(A2>B2,\"big\",\"small\")", "=AND(A2>0,B2>0)"],
        ["=OR(A2<0,B2>0)", "=NOT(A2<0)"],
      ],
      alignments: ["left", "left"],
    };
    expect(result(data, 3, 0)).toBe("big");
    expect(result(data, 3, 1)).toBe("TRUE");
    expect(result(data, 4, 0)).toBe("TRUE");
    expect(result(data, 4, 1)).toBe("TRUE");
  });

  it("CONCAT", () => {
    const data: TableData = {
      headers: ["A", "B"],
      rows: [["Hello", "World"], ["=CONCAT(A2,\" \",B2)", ""]],
      alignments: ["left", "left"],
    };
    expect(result(data, 3, 0)).toBe("Hello World");
  });
});

describe("evaluateTable — ranges that include non-numeric cells", () => {
  it("SUM/AVERAGE/MIN/MAX skip a header row included in the range", () => {
    const data: TableData = {
      headers: ["Item", "Amount"],
      rows: [
        ["Rent", "$2,000"],
        ["Food", "$400"],
        ["Total", "=SUM(B1:B3)"],
      ],
      alignments: ["left", "left"],
    };
    // B1 is the header "Amount" (text) — should be skipped, not error.
    expect(result(data, 4, 1)).toBe("$2,400.00");
  });

  it("AVERAGE ignores a text label cell mixed into the range", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["10"], ["n/a"], ["20"], ["=AVERAGE(A2:A4)"]],
      alignments: ["left"],
    };
    expect(result(data, 5, 0)).toBe("15");
  });

  it("a genuine #REF! inside a range still propagates", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=SUM(A1:Z9)"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("#REF!");
  });
});

describe("evaluateTable — errors", () => {
  it("#REF! for out-of-bounds refs", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=SUM(Z9)"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("#REF!");
  });

  it("#DIV/0! on division by zero", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=10/0"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("#DIV/0!");
  });

  it("#NAME? for unknown functions", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=NOPE(1)"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("#NAME?");
  });

  it("#CIRCULAR! for a self-referencing cell", () => {
    const data: TableData = {
      headers: ["A"],
      rows: [["=A2+1"]],
      alignments: ["left"],
    };
    expect(result(data, 2, 0)).toBe("#CIRCULAR!");
  });

  it("#CIRCULAR! for a mutual reference cycle", () => {
    const data: TableData = {
      headers: ["A", "B"],
      rows: [["=B2", "=A2"]],
      alignments: ["left", "left"],
    };
    expect(result(data, 2, 0)).toBe("#CIRCULAR!");
    expect(result(data, 2, 1)).toBe("#CIRCULAR!");
  });
});

describe("formatFormulaValue", () => {
  it("formats numbers, booleans, and errors", () => {
    expect(formatFormulaValue(5)).toBe("5");
    expect(formatFormulaValue(3.456)).toBe("3.46");
    expect(formatFormulaValue(true)).toBe("TRUE");
    expect(formatFormulaValue("hi")).toBe("hi");
  });
});
