import type { TableData } from "./tableParser";
import { isFormulaCell, normalizeNoteKey, type RangeRef } from "./formula/addressing";
import { detectCurrencyDef } from "./formula/currency";
import { FUNCTIONS } from "./formula/functions";
import { parseFormulaTokens, tokenize, type Node } from "./formula/parser";
import { formatFormulaValue, resolveCellText, type CurrencyHint, type FormulaCellResult } from "./formula/results";
import { applyBinary, FormulaError, isFormulaError, ParseError, toNumber, type FormulaValue } from "./formula/values";

// Public entry point of the table formula engine. The stages live in
// ./formula/: values & coercion, A1 addressing, currency parsing, the
// tokenizer/parser, the function registry, and result formatting.
export { FormulaError, type FormulaErrorCode, type FormulaValue } from "./formula/values";
export {
  colIndexToLetter,
  isFormulaCell,
  letterToColIndex,
  normalizeNoteKey,
  parseCellRef,
  parseRangeRef,
  type RangeRef,
} from "./formula/addressing";
export { parseAmount } from "./formula/currency";
export { FUNCTIONS } from "./formula/functions";
export { formatFormulaValue, type CurrencyHint, type FormulaCellResult } from "./formula/results";

// keep this a bounded, synchronous, one-hop lookup.
export function evaluateTable(
  data: TableData,
  namedTables: Map<string, TableData> = new Map(),
  fileTables: Map<string, Map<string, TableData>> = new Map(),
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
  let currentEvalCol = -1;

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
    const prevEvalCol = currentEvalCol;
    currencyVotes = new Map();
    currentEvalRow = row;
    currentEvalCol = col;
    let value: FormulaValue;
    let ast: Node | null = null;
    try {
      ast = parseFormulaTokens(tokenize(raw.trim().slice(1)));
      value = evalNode(ast);
    } catch (e) {
      value = new FormulaError(e instanceof ParseError ? e.code : "#VALUE!");
    }
    currentEvalRow = prevEvalRow;
    currentEvalCol = prevEvalCol;
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
        // A range that covers the formula's own cell (e.g. a total at the
        // bottom of `=SUM(B2:B10)` after rows were added) skips that cell
        // instead of reporting #CIRCULAR! — the same leniency whole-column
        // refs get. Genuine cycles through other cells still error.
        if (r === currentEvalRow && c === currentEvalCol) continue;
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

  // --- Cross-file helpers -----------------------------------------------

  const otherFileResultsCache = new Map<string, Map<string, FormulaCellResult>>();

  function resolveFileTable(noteRef: string): TableData | null {
    const { key: fileKey, heading } = normalizeNoteKey(noteRef);
    const tables = fileTables.get(fileKey);
    if (!tables || tables.size === 0) return null;
    if (heading) {
      const lower = heading.toLowerCase();
      for (const [h, d] of tables) {
        if (h.toLowerCase() === lower) return d;
      }
      return null;
    }
    // No heading given — use the single table, or the first by document
    // order when the file has more than one.
    return tables.values().next().value ?? null;
  }

  function getOtherFileResults(noteRef: string): Map<string, FormulaCellResult> | null {
    const { key: fileKey, heading } = normalizeNoteKey(noteRef);
    const otherData = resolveFileTable(noteRef);
    if (!otherData) return null;
    const cacheKey = `${fileKey}::${heading ?? ""}`;
    if (!otherFileResultsCache.has(cacheKey)) {
      // Deliberately no `fileTables` passed through — cross-file refs don't
      // chain, so any `[[...]]` formula inside the other file resolves to #REF!.
      const otherNamedTables = fileTables.get(fileKey) ?? new Map<string, TableData>();
      otherFileResultsCache.set(cacheKey, evaluateTable(otherData, otherNamedTables));
    }
    return otherFileResultsCache.get(cacheKey)!;
  }

  function flattenOtherFileTableColumn(noteRef: string, col: number): FormulaValue[] | FormulaError {
    const otherData = resolveFileTable(noteRef);
    if (!otherData) return new FormulaError("#REF!");
    const tResults = getOtherFileResults(noteRef);
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
      case "filetableref": {
        const tResults = getOtherFileResults(node.noteRef);
        if (!tResults) return new FormulaError("#REF!");
        const otherData = resolveFileTable(node.noteRef)!;
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
      case "filetablecol":
        // Only valid inside a function — bare filetablecol has no scalar value.
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
          } else if (a.kind === "filetablecol") {
            const flattened = flattenOtherFileTableColumn(a.noteRef, a.col);
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
