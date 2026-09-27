import { parseAmount } from "./currency";

// --- Errors & values -------------------------------------------------------

export type FormulaErrorCode = "#REF!" | "#DIV/0!" | "#CIRCULAR!" | "#NAME?" | "#VALUE!";

export class FormulaError {
  constructor(public code: FormulaErrorCode) {}
  toString() {
    return this.code;
  }
}

export type FormulaValue = number | string | boolean | FormulaError;

export function isFormulaError(v: unknown): v is FormulaError {
  return v instanceof FormulaError;
}

export class ParseError extends Error {
  constructor(public code: FormulaErrorCode) {
    super(code);
  }
}

// --- Coercion helpers -------------------------------------------------

export function toNumber(v: FormulaValue): number | FormulaError {
  if (isFormulaError(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = parseAmount(v);
  return n === null ? new FormulaError("#VALUE!") : n;
}

export function toBoolean(v: FormulaValue): boolean | FormulaError {
  if (isFormulaError(v)) return v;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const u = v.trim().toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  const n = parseAmount(v);
  if (n !== null) return n !== 0;
  return new FormulaError("#VALUE!");
}

export function formatScalar(v: FormulaValue): string {
  if (isFormulaError(v)) return v.code;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}

function compare(op: string, l: FormulaValue, r: FormulaValue): FormulaValue {
  const ln = typeof l === "number" ? l : typeof l === "string" ? parseAmount(l) : null;
  const rn = typeof r === "number" ? r : typeof r === "string" ? parseAmount(r) : null;
  let cmp: number;
  if (ln !== null && rn !== null) {
    cmp = ln < rn ? -1 : ln > rn ? 1 : 0;
  } else {
    const ls = formatScalar(l);
    const rs = formatScalar(r);
    cmp = ls < rs ? -1 : ls > rs ? 1 : 0;
  }
  switch (op) {
    case "=":
      return cmp === 0;
    case "<>":
      return cmp !== 0;
    case "<":
      return cmp < 0;
    case ">":
      return cmp > 0;
    case "<=":
      return cmp <= 0;
    case ">=":
      return cmp >= 0;
    default:
      return new FormulaError("#VALUE!");
  }
}

export function applyBinary(op: string, l: FormulaValue, r: FormulaValue): FormulaValue {
  if (op === "=" || op === "<>" || op === "<" || op === ">" || op === "<=" || op === ">=") {
    return compare(op, l, r);
  }
  const ln = toNumber(l);
  if (isFormulaError(ln)) return ln;
  const rn = toNumber(r);
  if (isFormulaError(rn)) return rn;
  switch (op) {
    case "+":
      return ln + rn;
    case "-":
      return ln - rn;
    case "*":
      return ln * rn;
    case "/":
      return rn === 0 ? new FormulaError("#DIV/0!") : ln / rn;
    default:
      return new FormulaError("#VALUE!");
  }
}
