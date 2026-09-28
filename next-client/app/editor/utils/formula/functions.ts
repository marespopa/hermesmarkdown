import { parseAmount } from "./currency";
import { FormulaError, formatScalar, isFormulaError, toBoolean, toNumber, type FormulaValue } from "./values";

// --- Function registry --------------------------------------------------
// Extending the engine later (VLOOKUP, COUNTIF, ...) is just adding an
// entry here — no parser/evaluator changes needed.

// Lenient coercion — used by aggregate functions (SUM, AVERAGE, MIN, MAX)
// over a range. Matches spreadsheet behavior: text cells (e.g. a header row
// accidentally included in the range, or a label column) are silently
// skipped rather than failing the whole calculation. A genuine error
// (#REF!, #CIRCULAR!, ...) from a referenced cell still propagates, since
// that's a broken reference, not just non-numeric text.
function numArgsLenient(args: FormulaValue[]): number[] | FormulaError {
  const out: number[] = [];
  for (const a of args) {
    if (isFormulaError(a)) return a;
    if (typeof a === "string") {
      const n = parseAmount(a);
      if (n !== null) out.push(n);
      continue;
    }
    out.push(toNumber(a) as number);
  }
  return out;
}

export const FUNCTIONS: Record<string, (args: FormulaValue[]) => FormulaValue> = {
  SUM: (args) => {
    const ns = numArgsLenient(args);
    if (isFormulaError(ns)) return ns;
    return ns.reduce((a, b) => a + b, 0);
  },
  AVERAGE: (args) => {
    const ns = numArgsLenient(args);
    if (isFormulaError(ns)) return ns;
    if (ns.length === 0) return new FormulaError("#DIV/0!");
    return ns.reduce((a, b) => a + b, 0) / ns.length;
  },
  MIN: (args) => {
    const ns = numArgsLenient(args);
    if (isFormulaError(ns)) return ns;
    return ns.length ? Math.min(...ns) : 0;
  },
  MAX: (args) => {
    const ns = numArgsLenient(args);
    if (isFormulaError(ns)) return ns;
    return ns.length ? Math.max(...ns) : 0;
  },
  COUNT: (args) =>
    args.filter((a) => typeof a === "number" || (typeof a === "string" && parseAmount(a) !== null)).length,
  COUNTA: (args) => args.filter((a) => !(typeof a === "string" && a.trim() === "")).length,
  ABS: (args) => {
    const n = toNumber(args[0]);
    return isFormulaError(n) ? n : Math.abs(n);
  },
  ROUND: (args) => {
    const n = toNumber(args[0]);
    if (isFormulaError(n)) return n;
    const d = args.length > 1 ? toNumber(args[1]) : 0;
    if (isFormulaError(d)) return d;
    const factor = Math.pow(10, d);
    return Math.round(n * factor) / factor;
  },
  IF: (args) => {
    const cond = toBoolean(args[0]);
    if (isFormulaError(cond)) return cond;
    return cond ? args[1] ?? true : args[2] ?? false;
  },
  AND: (args) => {
    for (const a of args) {
      const b = toBoolean(a);
      if (isFormulaError(b)) return b;
      if (!b) return false;
    }
    return true;
  },
  OR: (args) => {
    for (const a of args) {
      const b = toBoolean(a);
      if (isFormulaError(b)) return b;
      if (b) return true;
    }
    return false;
  },
  NOT: (args) => {
    const b = toBoolean(args[0]);
    return isFormulaError(b) ? b : !b;
  },
  CONCAT: (args) => args.map(formatScalar).join(""),
};
