import { colIndexToLetter, letterToColIndex } from "./addressing";

// --- Reference shifting ---------------------------------------------------
// Rewrites a formula's same-table references after a row or column is
// inserted, deleted or reordered (move, sort), the way a spreadsheet does:
// references move with their cells, ranges grow or shrink, and a reference
// to a deleted cell (or a fully deleted range/column) becomes `#REF!`. Cross-table
// (`Name!C2`, `"Name"!B`) and cross-file (`[[Note]]!B4`) references point at
// other tables and are left alone.

// Row indices are A1 row numbers (header = 1); column indices are 0-based.
export type ReferenceShift =
  | {
      axis: "row" | "col";
      kind: "insert" | "delete";
      // For an insert, the new row/column's index; for a delete, the removed one's.
      at: number;
    }
  | {
      axis: "row" | "col";
      kind: "reorder";
      // Old index -> new index for every row/column that moved.
      moved: Map<number, number>;
    };

// The reorder that `order` describes (`order[newPos] = oldPos`, as from a
// sort), with positions offset by `base` (2 for data rows: row 2 is rows[0]).
export function reorderFromOrder(axis: "row" | "col", order: number[], base: number): ReferenceShift {
  const moved = new Map<number, number>();
  order.forEach((oldPos, newPos) => {
    if (oldPos !== newPos) moved.set(oldPos + base, newPos + base);
  });
  return { axis, kind: "reorder", moved };
}

// Swaps indices `a` and `b` (move row/column up, down, left or right).
export function swapReorder(axis: "row" | "col", a: number, b: number): ReferenceShift {
  return { axis, kind: "reorder", moved: new Map([[a, b], [b, a]]) };
}

export const REF_ERROR = "#REF!";

function shiftIndex(k: number, shift: ReferenceShift): number | null {
  if (shift.kind === "reorder") return shift.moved.get(k) ?? k;
  if (shift.kind === "insert") return k >= shift.at ? k + 1 : k;
  if (k === shift.at) return null;
  return k > shift.at ? k - 1 : k;
}

// A reordered range keeps covering the same cells when they still sit next
// to each other (sorting inside it, moving a row within it). When they
// don't (a row moved out across its edge), the range keeps its position.
function reorderSpan(start: number, end: number, moved: Map<number, number>): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [from, to] of moved) {
    if (from < start || from > end) continue;
    min = Math.min(min, to);
    max = Math.max(max, to);
  }
  if (min === Infinity) return [start, end];
  // The unmoved ends of the range, if any.
  let lo = start;
  while (lo <= end && moved.has(lo)) lo++;
  let hi = end;
  while (hi >= start && moved.has(hi)) hi--;
  if (lo <= end) {
    min = Math.min(min, lo);
    max = Math.max(max, hi);
  }
  return max - min === end - start ? [min, max] : [start, end];
}

function shiftSpan(start: number, end: number, shift: ReferenceShift): [number, number] | null {
  if (shift.kind === "reorder") return reorderSpan(start, end, shift.moved);
  if (shift.kind === "insert") {
    return [start >= shift.at ? start + 1 : start, end >= shift.at ? end + 1 : end];
  }
  const s = start > shift.at ? start - 1 : start;
  const e = end >= shift.at ? end - 1 : end;
  return e < s ? null : [s, e];
}

interface Cell {
  letters: string;
  row: number;
}

function cellText(cell: Cell, col: number, row: number): string {
  const unchanged = letterToColIndex(cell.letters) === col && cell.row === row;
  return unchanged ? `${cell.letters}${cell.row}` : `${colIndexToLetter(col)}${row}`;
}

function shiftCell(cell: Cell, shift: ReferenceShift): string {
  const col = letterToColIndex(cell.letters);
  if (shift.axis === "row") {
    const row = shiftIndex(cell.row, shift);
    return row === null ? REF_ERROR : cellText(cell, col, row);
  }
  const newCol = shiftIndex(col, shift);
  return newCol === null ? REF_ERROR : cellText(cell, newCol, cell.row);
}

function shiftRange(a: Cell, b: Cell, shift: ReferenceShift): string {
  const colA = letterToColIndex(a.letters);
  const colB = letterToColIndex(b.letters);
  if (shift.axis === "row") {
    // Shift as a span so deleting an endpoint row shrinks the range.
    const flipped = a.row > b.row;
    const span = shiftSpan(Math.min(a.row, b.row), Math.max(a.row, b.row), shift);
    if (!span) return REF_ERROR;
    const [rowA, rowB] = flipped ? [span[1], span[0]] : span;
    return `${cellText(a, colA, rowA)}:${cellText(b, colB, rowB)}`;
  }
  const flipped = colA > colB;
  const span = shiftSpan(Math.min(colA, colB), Math.max(colA, colB), shift);
  if (!span) return REF_ERROR;
  const [newA, newB] = flipped ? [span[1], span[0]] : span;
  return `${cellText(a, newA, a.row)}:${cellText(b, newB, b.row)}`;
}

// Index of the next non-space character at or after `i`.
function skipSpaces(src: string, i: number): number {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

// Reads a CELLREF (letters + digits) at `i`, or null.
function readCell(src: string, i: number): { cell: Cell; end: number } | null {
  let j = i;
  while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
  if (j === i) return null;
  let k = j;
  while (k < src.length && /\d/.test(src[k])) k++;
  if (k === j) return null;
  return { cell: { letters: src.slice(i, j), row: parseInt(src.slice(j, k), 10) }, end: k };
}

// `formula` is the full cell text, starting with `=`. Returns it unchanged
// when no reference moves.
export function shiftFormulaReferences(formula: string, shift: ReferenceShift): string {
  let out = "";
  let i = 0;
  // Last non-space character emitted; `!` means the next ref is another table's.
  let prev = "";
  const n = formula.length;

  while (i < n) {
    const ch = formula[i];
    if (ch === '"') {
      const end = formula.indexOf('"', i + 1);
      const stop = end === -1 ? n : end + 1;
      out += formula.slice(i, stop);
      prev = '"';
      i = stop;
      continue;
    }
    if (ch === "[" && formula[i + 1] === "[") {
      const end = formula.indexOf("]]", i + 2);
      const stop = end === -1 ? n : end + 2;
      out += formula.slice(i, stop);
      prev = "]";
      i = stop;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const foreign = prev === "!";
      const first = readCell(formula, i);
      if (first) {
        const colon = skipSpaces(formula, first.end);
        const second = formula[colon] === ":" ? readCell(formula, skipSpaces(formula, colon + 1)) : null;
        if (second) {
          out += foreign ? formula.slice(i, second.end) : shiftRange(first.cell, second.cell, shift);
          i = second.end;
        } else {
          out += foreign ? formula.slice(i, first.end) : shiftCell(first.cell, shift);
          i = first.end;
        }
        prev = "0";
        continue;
      }
      let j = i;
      while (j < n && /[A-Za-z]/.test(formula[j])) j++;
      const word = formula.slice(i, j);
      const next = formula[skipSpaces(formula, j)];
      const upper = word.toUpperCase();
      // A bare column (`SUM(B)`), not a function name, table name or boolean.
      const isColumn = !foreign && next !== "(" && next !== "!" && upper !== "TRUE" && upper !== "FALSE";
      if (isColumn && shift.axis === "col") {
        const col = shiftIndex(letterToColIndex(word), shift);
        out += col === null ? REF_ERROR : col === letterToColIndex(word) ? word : colIndexToLetter(col);
      } else {
        out += word;
      }
      prev = "a";
      i = j;
      continue;
    }
    out += ch;
    if (!/\s/.test(ch)) prev = ch;
    i++;
  }
  return out;
}
