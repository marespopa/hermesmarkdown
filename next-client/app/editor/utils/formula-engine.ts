import type { TableData } from "./tableParser";

// --- Errors & values -------------------------------------------------------

export type FormulaErrorCode = "#REF!" | "#DIV/0!" | "#CIRCULAR!" | "#NAME?" | "#VALUE!";

export class FormulaError {
  constructor(public code: FormulaErrorCode) {}
  toString() {
    return this.code;
  }
}

export type FormulaValue = number | string | boolean | FormulaError;

function isFormulaError(v: unknown): v is FormulaError {
  return v instanceof FormulaError;
}

class ParseError extends Error {
  constructor(public code: FormulaErrorCode) {
    super(code);
  }
}

// --- A1 addressing -----------------------------------------------------
// Column 0 -> "A", 1 -> "B", ... 25 -> "Z", 26 -> "AA", etc. Row 1 is the
// table's header row; row 2 is rows[0], row N is rows[N-2] (mirrors how a
// spreadsheet treats its own header row as row 1).

export function colIndexToLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function letterToColIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

const CELL_REF_RE = /^([A-Za-z]+)(\d+)$/;

export function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = CELL_REF_RE.exec(ref.trim());
  if (!m) return null;
  const row = parseInt(m[2], 10);
  if (row < 1) return null;
  return { row, col: letterToColIndex(m[1]) };
}

export interface RangeRef {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export function parseRangeRef(ref: string): RangeRef | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const a = parseCellRef(parts[0]);
  const b = parseCellRef(parts[1]);
  if (!a || !b) return null;
  return {
    startRow: Math.min(a.row, b.row),
    endRow: Math.max(a.row, b.row),
    startCol: Math.min(a.col, b.col),
    endCol: Math.max(a.col, b.col),
  };
}

export function isFormulaCell(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  return t.startsWith("=") && t.length > 1;
}

// --- Currency-tolerant single-cell number coercion --------------------
// A formula referencing a cell like "$2,000" or "1000 RON" should still
// treat it as a number — strip any recognized currency token (any
// placement, with or without a space) and thousands separators.

interface CurrencyDef {
  symbol: string;
  // Canonical display position when formatting a result — detection itself
  // is placement-agnostic regardless of this flag.
  suffix: boolean;
  aliases: string[];
}

// Order matters only as a tie-breaker for aliases starting at the same
// offset — "C$"/"A$" must be checked before bare "$" so "C$50" detects as
// CAD, not USD.
const CURRENCY_DEFS: CurrencyDef[] = [
  { symbol: "C$", suffix: false, aliases: ["C$"] },
  { symbol: "A$", suffix: false, aliases: ["A$"] },
  { symbol: "$", suffix: false, aliases: ["$"] },
  { symbol: "€", suffix: false, aliases: ["€"] },
  { symbol: "£", suffix: false, aliases: ["£"] },
  { symbol: "¥", suffix: false, aliases: ["¥"] },
  { symbol: "₹", suffix: false, aliases: ["₹"] },
  { symbol: "RON", suffix: true, aliases: ["RON", "lei"] },
];

function escapeRegex(s: string): string {
  return s.replace(/[.$*+?()[\]{}|^\\]/g, "\\$&");
}

const CURRENCY_STRIP_RE = new RegExp(
  CURRENCY_DEFS.flatMap((d) => d.aliases).map(escapeRegex).join("|"),
  "gi",
);
const CURRENCY_DETECT_RES = CURRENCY_DEFS.map(
  (def) => new RegExp(def.aliases.map(escapeRegex).join("|"), "i"),
);

export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(CURRENCY_STRIP_RE, "").replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

// Which currency (if any) a cell's raw text is tagged with — used to carry
// a column's currency through SUM/AVERAGE/etc. into the formatted result.
function detectCurrencyDef(text: string): CurrencyDef | null {
  for (let i = 0; i < CURRENCY_DEFS.length; i++) {
    if (CURRENCY_DETECT_RES[i].test(text)) return CURRENCY_DEFS[i];
  }
  return null;
}

// --- Tokenizer ----------------------------------------------------------

type TokenType =
  | "NUMBER"
  | "STRING"
  | "CELLREF"
  | "IDENT"
  | "OP"
  | "COMPARE"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COLON"
  | "BANG"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ch });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ch });
      i++;
      continue;
    }
    if (ch === ":") {
      tokens.push({ type: "COLON", value: ch });
      i++;
      continue;
    }
    if (ch === "!") {
      tokens.push({ type: "BANG", value: ch });
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < n && src[j] !== '"') {
        s += src[j];
        j++;
      }
      tokens.push({ type: "STRING", value: s });
      i = j + 1;
      continue;
    }
    if (ch === "<" || ch === ">") {
      if (src[i + 1] === "=") {
        tokens.push({ type: "COMPARE", value: ch + "=" });
        i += 2;
        continue;
      }
      if (ch === "<" && src[i + 1] === ">") {
        tokens.push({ type: "COMPARE", value: "<>" });
        i += 2;
        continue;
      }
      tokens.push({ type: "COMPARE", value: ch });
      i++;
      continue;
    }
    if (ch === "=") {
      tokens.push({ type: "COMPARE", value: "=" });
      i++;
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z]/.test(src[j])) j++;
      const letters = src.slice(i, j);
      if (j < n && /\d/.test(src[j])) {
        let k = j;
        while (k < n && /\d/.test(src[k])) k++;
        tokens.push({ type: "CELLREF", value: letters + src.slice(j, k) });
        i = k;
        continue;
      }
      tokens.push({ type: "IDENT", value: letters });
      i = j;
      continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(src[i + 1] || ""))) {
      let j = i;
      while (j < n && /[\d.]/.test(src[j])) j++;
      let numStr = src.slice(i, j);
      if (j < n && src[j] === "%") {
        numStr = String(parseFloat(numStr) / 100);
        j++;
      }
      tokens.push({ type: "NUMBER", value: numStr });
      i = j;
      continue;
    }
    // Unrecognized character — surface as #VALUE! at parse time.
    throw new ParseError("#VALUE!");
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

// --- AST & parser ---------------------------------------------------------

type Node =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "ref"; row: number; col: number }
  | ({ kind: "range" } & RangeRef)
  | { kind: "col"; col: number }
  | { kind: "tableref"; tableName: string; row: number; col: number }
  | { kind: "tablecol"; tableName: string; col: number }
  | { kind: "unary"; op: "-"; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

function parseFormulaTokens(tokens: Token[]): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const advance = () => tokens[pos++];
  const expect = (type: TokenType) => {
    if (peek().type !== type) throw new ParseError("#VALUE!");
    return advance();
  };

  function parsePrimary(): Node {
    const t = peek();
    if (t.type === "NUMBER") {
      advance();
      return { kind: "num", value: parseFloat(t.value) };
    }
    if (t.type === "STRING") {
      advance();
      // Quoted cross-table ref: "Heading Name"!C2 or "Heading Name"!B
      if (peek().type === "BANG") {
        advance(); // consume !
        const next = peek();
        if (next.type === "CELLREF") {
          advance();
          const ref = parseCellRef(next.value);
          if (!ref) throw new ParseError("#REF!");
          return { kind: "tableref", tableName: t.value, row: ref.row, col: ref.col };
        }
        if (next.type === "IDENT") {
          advance();
          return { kind: "tablecol", tableName: t.value, col: letterToColIndex(next.value) };
        }
        throw new ParseError("#REF!");
      }
      return { kind: "str", value: t.value };
    }
    if (t.type === "IDENT") {
      const upper = t.value.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        advance();
        return { kind: "bool", value: upper === "TRUE" };
      }
      advance();
      if (peek().type === "LPAREN") {
        advance();
        const args: Node[] = [];
        if (peek().type !== "RPAREN") {
          args.push(parseArg());
          while (peek().type === "COMMA") {
            advance();
            args.push(parseArg());
          }
        }
        expect("RPAREN");
        return { kind: "call", name: upper, args };
      }
      // Cross-table reference: HeadingName!C2 or HeadingName!B (column)
      if (peek().type === "BANG") {
        advance(); // consume !
        const next = peek();
        if (next.type === "CELLREF") {
          advance();
          const ref = parseCellRef(next.value);
          if (!ref) throw new ParseError("#REF!");
          return { kind: "tableref", tableName: t.value, row: ref.row, col: ref.col };
        }
        if (next.type === "IDENT") {
          advance();
          return { kind: "tablecol", tableName: t.value, col: letterToColIndex(next.value) };
        }
        throw new ParseError("#REF!");
      }
      // Bare A-Z identifier (not a bool) = whole-column reference, e.g. SUM(B)
      if (/^[A-Za-z]+$/.test(t.value) && upper !== "TRUE" && upper !== "FALSE") {
        return { kind: "col", col: letterToColIndex(upper) };
      }
      throw new ParseError("#NAME?");
    }
    if (t.type === "CELLREF") {
      advance();
      const ref = parseCellRef(t.value);
      if (!ref) throw new ParseError("#REF!");
      return { kind: "ref", row: ref.row, col: ref.col };
    }
    if (t.type === "LPAREN") {
      advance();
      const e = parseExpr();
      expect("RPAREN");
      return e;
    }
    if (t.type === "OP" && t.value === "-") {
      advance();
      return { kind: "unary", op: "-", arg: parseUnary() };
    }
    throw new ParseError("#VALUE!");
  }

  function parseUnary(): Node {
    if (peek().type === "OP" && peek().value === "-") {
      advance();
      return { kind: "unary", op: "-", arg: parseUnary() };
    }
    return parsePrimary();
  }

  function parseTerm(): Node {
    let left = parseUnary();
    while (peek().type === "OP" && (peek().value === "*" || peek().value === "/")) {
      const op = advance().value;
      left = { kind: "binary", op, left, right: parseUnary() };
    }
    return left;
  }

  function parseAdditive(): Node {
    let left = parseTerm();
    while (peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
      const op = advance().value;
      left = { kind: "binary", op, left, right: parseTerm() };
    }
    return left;
  }

  function parseComparison(): Node {
    let left = parseAdditive();
    while (peek().type === "COMPARE") {
      const op = advance().value;
      left = { kind: "binary", op, left, right: parseAdditive() };
    }
    return left;
  }

  function parseExpr(): Node {
    return parseComparison();
  }

  // Function arguments may be a bare range (only valid directly as an arg).
  function parseArg(): Node {
    if (
      peek().type === "CELLREF" &&
      tokens[pos + 1]?.type === "COLON" &&
      tokens[pos + 2]?.type === "CELLREF"
    ) {
      const a = advance();
      advance(); // colon
      const b = advance();
      const range = parseRangeRef(`${a.value}:${b.value}`);
      if (!range) throw new ParseError("#REF!");
      return { kind: "range", ...range };
    }
    return parseExpr();
  }

  const result = parseExpr();
  if (peek().type !== "EOF") throw new ParseError("#VALUE!");
  return result;
}

// --- Coercion helpers -------------------------------------------------

function toNumber(v: FormulaValue): number | FormulaError {
  if (isFormulaError(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = parseAmount(v);
  return n === null ? new FormulaError("#VALUE!") : n;
}

function toBoolean(v: FormulaValue): boolean | FormulaError {
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

function formatScalar(v: FormulaValue): string {
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

function applyBinary(op: string, l: FormulaValue, r: FormulaValue): FormulaValue {
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

// --- Function registry --------------------------------------------------
// Extending the engine later (VLOOKUP, COUNTIF, ...) is just adding an
// entry here — no parser/evaluator changes needed.

// Strict coercion — used by single-value functions (ABS, ROUND) where a
// non-numeric argument is genuinely a usage error.
function numArgs(args: FormulaValue[]): number[] | FormulaError {
  const out: number[] = [];
  for (const a of args) {
    const n = toNumber(a);
    if (isFormulaError(n)) return n;
    out.push(n);
  }
  return out;
}

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

// --- Table evaluation ----------------------------------------------------

export interface CurrencyHint {
  symbol: string;
  suffix: boolean;
}

export interface FormulaCellResult {
  raw: string;
  value: FormulaValue;
  display: string;
  currency: CurrencyHint | null;
}

export function formatFormulaValue(v: FormulaValue, currency?: CurrencyHint | null): string {
  if (isFormulaError(v)) return v.code;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    const rounded = Math.round(v * 100) / 100;
    const isInt = Number.isInteger(rounded);
    if (!currency) {
      return isInt ? String(rounded) : String(rounded);
    }
    const formatted = rounded.toLocaleString("en", {
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return currency.suffix ? `${formatted} ${currency.symbol}` : `${currency.symbol}${formatted}`;
  }
  return v;
}

function resolveCellText(data: TableData, row: number, col: number): string | null {
  if (col < 0 || col >= data.headers.length) return null;
  if (row === 1) return data.headers[col] ?? "";
  const dataRowIdx = row - 2;
  if (dataRowIdx < 0 || dataRowIdx >= data.rows.length) return null;
  return data.rows[dataRowIdx][col] ?? "";
}

// Evaluates every formula cell in `data`. Returns a map keyed `"{row}_{col}"`
// (row 1 = header) containing only the cells that are formulas — callers use
// this to decide which cells need a computed display instead of raw text.
// Full recompute on every call: table sizes here are small (tens of cells),
// so there's no need for an incremental dependency graph.
//
// `namedTables` maps the markdown heading above each table (case-insensitive)
// to its parsed TableData, enabling cross-table references like `=SUM(Income!B)`
// or `=Expenses!B3`.
export function evaluateTable(
  data: TableData,
  namedTables: Map<string, TableData> = new Map(),
): Map<string, FormulaCellResult> {
  const results = new Map<string, FormulaCellResult>();
  const evaluating = new Set<string>();

  const key = (row: number, col: number) => `${row}_${col}`;

  // Tracks which currency symbol(s) the cells *directly referenced* by the
  // formula currently being evaluated are tagged with — so e.g. summing a
  // column of "$2,000" cells formats the result as "$2,400.00" instead of a
  // bare number. Save/restored around each nested formula's own evaluation
  // (a stack, via this one mutable slot) so a dependency's references don't
  // bleed into the cell that's asking for them.
  let currencyVotes: Map<string, boolean> | null = null;
  let currentEvalRow = -1;

  function recordCurrency(text: string) {
    if (!currencyVotes) return;
    const def = detectCurrencyDef(text);
    if (def) currencyVotes.set(def.symbol, def.suffix);
  }

  // Records an already-known hint directly (no text to re-detect) — used to
  // propagate a *cached* formula cell's currency to whatever references it,
  // since the cache-hit path below never re-runs the detection logic.
  function recordCurrencyHint(hint: CurrencyHint | null) {
    if (!currencyVotes || !hint) return;
    currencyVotes.set(hint.symbol, hint.suffix);
  }

  function pickCurrency(): CurrencyHint | null {
    if (!currencyVotes || currencyVotes.size !== 1) return null;
    const [symbol, suffix] = [...currencyVotes.entries()][0];
    return { symbol, suffix };
  }

  function evalCell(row: number, col: number): FormulaValue {
    const k = key(row, col);
    const cached = results.get(k);
    if (cached) {
      recordCurrencyHint(cached.currency);
      return cached.value;
    }

    const raw = resolveCellText(data, row, col);
    if (raw === null) return new FormulaError("#REF!");
    if (!isFormulaCell(raw)) {
      recordCurrency(raw);
      return raw;
    }

    if (evaluating.has(k)) {
      const err = new FormulaError("#CIRCULAR!");
      results.set(k, { raw, value: err, display: formatFormulaValue(err), currency: null });
      return err;
    }

    evaluating.add(k);
    const prevVotes = currencyVotes;
    const prevEvalRow = currentEvalRow;
    currencyVotes = new Map();
    currentEvalRow = row;
    let value: FormulaValue;
    let ast: Node | null = null;
    try {
      ast = parseFormulaTokens(tokenize(raw.trim().slice(1)));
      value = evalNode(ast);
    } catch (e) {
      value = new FormulaError(e instanceof ParseError ? e.code : "#VALUE!");
    }
    currentEvalRow = prevEvalRow;
    // COUNT/COUNTA return a dimensionless count, not a currency amount, even
    // when counting cells in a currency column.
    const isCountFn = ast?.kind === "call" && (ast.name === "COUNT" || ast.name === "COUNTA");
    const detected = isCountFn ? null : pickCurrency();
    evaluating.delete(k);
    currencyVotes = prevVotes;
    // Propagate this cell's own detected currency up to whichever formula
    // referenced it (e.g. `=B2*2` where B2 is itself a `=SUM(...)` result).
    recordCurrencyHint(detected);
    results.set(k, { raw, value, display: formatFormulaValue(value, detected), currency: detected });
    return value;
  }

  function flattenRange(range: RangeRef): FormulaValue[] | FormulaError {
    const out: FormulaValue[] = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        const v = evalCell(r, c);
        if (isFormulaError(v)) return v;
        out.push(v);
      }
    }
    return out;
  }

  function flattenColumn(col: number): FormulaValue[] | FormulaError {
    const out: FormulaValue[] = [];
    const lastRow = data.rows.length + 1; // last A1 data row index
    for (let r = 2; r <= lastRow; r++) {
      if (r === currentEvalRow) continue; // skip the formula's own row
      const rowCells = data.rows[r - 2];
      if (rowCells.every((c) => !c || c.trim() === "")) continue; // skip spacer rows
      const v = evalCell(r, col);
      if (isFormulaError(v)) return v;
      out.push(v);
    }
    return out;
  }

  // --- Cross-table helpers ---------------------------------------------------

  const otherTableResultsCache = new Map<string, Map<string, FormulaCellResult>>();

  function resolveNamedTable(name: string): TableData | null {
    const lower = name.toLowerCase();
    for (const [k, v] of namedTables) {
      if (k.toLowerCase() === lower && v !== data) return v;
    }
    return null;
  }

  function getOtherTableResults(name: string): Map<string, FormulaCellResult> | null {
    const lower = name.toLowerCase();
    const otherData = resolveNamedTable(name);
    if (!otherData) return null;
    if (!otherTableResultsCache.has(lower)) {
      // Pass namedTables minus `otherData` to avoid infinite recursion
      const subMap = new Map<string, TableData>();
      for (const [k, v] of namedTables) {
        if (v !== otherData) subMap.set(k, v);
      }
      otherTableResultsCache.set(lower, evaluateTable(otherData, subMap));
    }
    return otherTableResultsCache.get(lower)!;
  }

  function flattenOtherTableColumn(tableName: string, col: number): FormulaValue[] | FormulaError {
    const otherData = resolveNamedTable(tableName);
    if (!otherData) return new FormulaError("#REF!");
    const tResults = getOtherTableResults(tableName);
    if (!tResults) return new FormulaError("#REF!");
    const out: FormulaValue[] = [];
    const lastRow = otherData.rows.length + 1;
    for (let r = 2; r <= lastRow; r++) {
      const rowCells = otherData.rows[r - 2];
      if (rowCells.every((c) => !c || c.trim() === "")) continue;
      const k = key(r, col);
      const cached = tResults.get(k);
      if (cached) {
        if (isFormulaCell(cached.raw)) continue;
        recordCurrencyHint(cached.currency);
        out.push(cached.value);
      } else {
        const raw = resolveCellText(otherData, r, col);
        if (raw === null) return new FormulaError("#REF!");
        if (isFormulaCell(raw)) continue;
        recordCurrency(raw);
        out.push(raw);
      }
    }
    return out;
  }

  function evalNode(node: Node): FormulaValue {
    switch (node.kind) {
      case "num":
        return node.value;
      case "str":
        return node.value;
      case "bool":
        return node.value;
      case "ref":
        return evalCell(node.row, node.col);
      case "range":
        // A bare range/column with no aggregating function around it has no scalar value.
        return new FormulaError("#VALUE!");
      case "col":
        return new FormulaError("#VALUE!");
      case "tableref": {
        const tResults = getOtherTableResults(node.tableName);
        if (!tResults) return new FormulaError("#REF!");
        const otherData = resolveNamedTable(node.tableName)!;
        const k = key(node.row, node.col);
        const cached = tResults.get(k);
        if (cached) {
          recordCurrencyHint(cached.currency);
          return cached.value;
        }
        const raw = resolveCellText(otherData, node.row, node.col);
        if (raw === null) return new FormulaError("#REF!");
        recordCurrency(raw);
        return raw;
      }
      case "tablecol":
        // Only valid inside a function — bare tablecol has no scalar value.
        return new FormulaError("#VALUE!");
      case "unary": {
        const v = evalNode(node.arg);
        if (isFormulaError(v)) return v;
        const n = toNumber(v);
        return isFormulaError(n) ? n : -n;
      }
      case "binary": {
        const l = evalNode(node.left);
        if (isFormulaError(l)) return l;
        const r = evalNode(node.right);
        if (isFormulaError(r)) return r;
        return applyBinary(node.op, l, r);
      }
      case "call": {
        const argValues: FormulaValue[] = [];
        for (const a of node.args) {
          if (a.kind === "range") {
            const flattened = flattenRange(a);
            if (isFormulaError(flattened)) return flattened;
            argValues.push(...flattened);
          } else if (a.kind === "col") {
            const flattened = flattenColumn(a.col);
            if (isFormulaError(flattened)) return flattened;
            argValues.push(...flattened);
          } else if (a.kind === "tablecol") {
            const flattened = flattenOtherTableColumn(a.tableName, a.col);
            if (isFormulaError(flattened)) return flattened;
            argValues.push(...flattened);
          } else {
            const v = evalNode(a);
            if (isFormulaError(v)) return v;
            argValues.push(v);
          }
        }
        const fn = FUNCTIONS[node.name];
        if (!fn) return new FormulaError("#NAME?");
        return fn(argValues);
      }
    }
  }

  for (let col = 0; col < data.headers.length; col++) {
    evalCell(1, col);
    for (let r = 0; r < data.rows.length; r++) evalCell(r + 2, col);
  }

  return results;
}
