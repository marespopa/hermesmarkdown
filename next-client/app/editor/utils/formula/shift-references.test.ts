// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateTable } from "../formula-engine";
import { reorderFromOrder, shiftFormulaReferences, swapReorder } from "./shift-references";

const deleteRow = (at: number) => ({ axis: "row", at, kind: "delete" }) as const;
const insertRow = (at: number) => ({ axis: "row", at, kind: "insert" }) as const;
const deleteCol = (at: number) => ({ axis: "col", at, kind: "delete" }) as const;
const insertCol = (at: number) => ({ axis: "col", at, kind: "insert" }) as const;

describe("shiftFormulaReferences — rows", () => {
  it("moves references below a deleted row up and leaves those above alone", () => {
    expect(shiftFormulaReferences("=B2+B4*B5", deleteRow(3))).toBe("=B2+B3*B4");
  });

  it("turns a reference to the deleted row into #REF!", () => {
    expect(shiftFormulaReferences("=B3+B4", deleteRow(3))).toBe("=#REF!+B3");
  });

  it("shrinks a range that loses an inner or end row", () => {
    expect(shiftFormulaReferences("=SUM(B2:B5)", deleteRow(3))).toBe("=SUM(B2:B4)");
    expect(shiftFormulaReferences("=SUM(B2:B5)", deleteRow(2))).toBe("=SUM(B2:B4)");
    expect(shiftFormulaReferences("=SUM(B2:B5)", deleteRow(5))).toBe("=SUM(B2:B4)");
  });

  it("turns a range whose only row was deleted into #REF!", () => {
    expect(shiftFormulaReferences("=SUM(B3:B3)", deleteRow(3))).toBe("=SUM(#REF!)");
  });

  it("moves references and grows ranges for an inserted row", () => {
    expect(shiftFormulaReferences("=SUM(B2:B5)+B3+B2", insertRow(3))).toBe("=SUM(B2:B6)+B4+B2");
  });

  it("leaves bare columns alone", () => {
    expect(shiftFormulaReferences("=SUM(B)", deleteRow(2))).toBe("=SUM(B)");
  });
});

describe("shiftFormulaReferences — columns", () => {
  it("moves cell references and bare columns past a deleted column", () => {
    expect(shiftFormulaReferences("=SUM(C)+C2+A2", deleteCol(1))).toBe("=SUM(B)+B2+A2");
  });

  it("turns references to the deleted column into #REF!", () => {
    expect(shiftFormulaReferences("=B2+SUM(B)", deleteCol(1))).toBe("=#REF!+SUM(#REF!)");
  });

  it("shrinks a range across columns", () => {
    expect(shiftFormulaReferences("=SUM(A2:C2)", deleteCol(1))).toBe("=SUM(A2:B2)");
  });

  it("moves references for an inserted column", () => {
    expect(shiftFormulaReferences("=A2+B2+SUM(B)", insertCol(1))).toBe("=A2+C2+SUM(C)");
  });

  it("leaves function names and booleans alone", () => {
    expect(shiftFormulaReferences("=IF(TRUE, ROUND(C2), 0)", deleteCol(1))).toBe("=IF(TRUE, ROUND(B2), 0)");
  });
});

describe("shiftFormulaReferences — other tables and text", () => {
  it("leaves cross-table and cross-file references alone", () => {
    expect(shiftFormulaReferences('=Income!C2+"Fixed costs"!C+[[Budget]]!C5+C2', deleteCol(1)))
      .toBe('=Income!C2+"Fixed costs"!C+[[Budget]]!C5+B2');
  });

  it("leaves text inside quotes alone", () => {
    expect(shiftFormulaReferences('=CONCAT("C2", C2)', deleteCol(1))).toBe('=CONCAT("C2", B2)');
  });
});

describe("#REF! in a formula", () => {
  it("evaluates to #REF!", () => {
    const results = evaluateTable({ headers: ["Item", "Cost"], rows: [["Rent", "=#REF!+1"]], alignments: [] });
    expect(results.get("2_1")?.display).toBe("#REF!");
  });
});

describe("shiftFormulaReferences — reorder", () => {
  it("swaps references to moved rows and columns", () => {
    expect(shiftFormulaReferences("=B3+B4+B5", swapReorder("row", 3, 4))).toBe("=B4+B3+B5");
    expect(shiftFormulaReferences("=A2+B2+SUM(A)", swapReorder("col", 0, 1))).toBe("=B2+A2+SUM(B)");
  });

  it("keeps a range when the moved rows stay inside it", () => {
    expect(shiftFormulaReferences("=SUM(B2:B5)", swapReorder("row", 2, 3))).toBe("=SUM(B2:B5)");
    expect(shiftFormulaReferences("=SUM(B2:B5)", reorderFromOrder("row", [3, 1, 0, 2], 2))).toBe("=SUM(B2:B5)");
  });

  it("follows a range whose rows all moved together", () => {
    expect(shiftFormulaReferences("=SUM(B2:B3)", reorderFromOrder("row", [2, 3, 0, 1], 2))).toBe("=SUM(B4:B5)");
  });

  it("keeps a range's position when a row moves across its edge", () => {
    expect(shiftFormulaReferences("=SUM(B2:B5)", swapReorder("row", 5, 6))).toBe("=SUM(B2:B5)");
  });
});
