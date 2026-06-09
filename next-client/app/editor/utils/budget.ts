import currency from "currency.js";
import { parseTableLenient } from "./tableParser";
import { serializeTable } from "./tableSerializer";

const CURRENCY_MAP: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  RON: "RON",
};

// Currencies written as a suffix after the number: 12,000RON
const SUFFIX_CURRENCIES = new Set(["RON"]);

const REGEX_CACHE: Record<string, RegExp> = {};

function getLineRegex(symbol: string, suffix: boolean): RegExp {
  const cacheKey = suffix ? `${symbol}_suffix` : symbol;
  if (REGEX_CACHE[cacheKey]) return REGEX_CACHE[cacheKey];
  const esc = symbol.replace(/[.$*+?()[\]{}|]/g, "\\$&");
  const pattern = suffix
    ? `-?[\\d,]+(?:\\.\\d+)?\\s?${esc}`
    : `-?${esc}\\s?[\\d,]+(?:\\.\\d+)?`;
  return (REGEX_CACHE[cacheKey] = new RegExp(pattern, "g"));
}

function isTableSeparator(line: string): boolean {
  return /^\|(\s*:?-+:?\s*\|)+$/.test(line.trim());
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|");
}

function splitCells(line: string): string[] {
  return line.trim().slice(1, -1).split("|").map((c) => c.trim());
}

function extractCellSum(cell: string, lineRegex: RegExp, symbol: string): currency {
  lineRegex.lastIndex = 0;
  let sum = currency(0);
  let match;
  while ((match = lineRegex.exec(cell)) !== null) {
    const clean = match[0].replace(/,/g, "").replace(symbol, "").trim();
    sum = sum.add(clean);
  }
  return sum;
}

export function runAutoBudget(val: string, currencyCode: string = "USD"): string {
  if (!val.includes("Total:")) return val;

  const lines = val.split("\n");
  const symbol = CURRENCY_MAP[currencyCode] || "$";
  const isSuffix = SUFFIX_CURRENCIES.has(currencyCode);
  const lineRegex = getLineRegex(symbol, isSuffix);

  function fmt(sum: currency): string {
    return sum.format({ symbol, separator: ",", pattern: isSuffix ? "#!" : "!#" });
  }

  let changed = false;
  const nextLines = [...lines];
  let plainSum = currency(0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- Table row ---
    if (isTableRow(line)) {
      if (isTableSeparator(line)) continue;

      if (line.includes("Total:")) {
        // Total: inside table cells → sum each column that has a Total: cell
        const cells = splitCells(line);
        const totalColIndices = cells
          .map((c, idx) => (/Total:/.test(c) ? idx : -1))
          .filter((idx) => idx !== -1);
        if (totalColIndices.length === 0) continue;

        const newCells = [...cells];
        for (const colIdx of totalColIndices) {
          let colSum = currency(0);
          for (let j = i - 1; j >= 0; j--) {
            if (!isTableRow(lines[j])) break;
            if (isTableSeparator(lines[j])) continue;
            const rowCells = splitCells(lines[j]);
            if (rowCells[colIdx] !== undefined) {
              colSum = colSum.add(extractCellSum(rowCells[colIdx], lineRegex, symbol));
            }
          }
          newCells[colIdx] = newCells[colIdx].replace(/Total:.*/, `Total: ${fmt(colSum)}`);
        }

        const newLine = "| " + newCells.join(" | ") + " |";
        if (newLine !== line) {
          nextLines[i] = newLine;
          changed = true;
        }
      }
      // Don't accumulate table values into the plain-text sum
      continue;
    }

    // --- Plain-text Total: line ---
    if (line.includes("Total:")) {
      const m = line.match(/^(\s*)Total:/);
      if (m) {
        const newLine = `${m[1]}Total: ${fmt(plainSum)}`;
        plainSum = currency(0);
        if (newLine !== line) {
          nextLines[i] = newLine;
          changed = true;
        }
      }
      continue;
    }

    // --- Plain-text value line ---
    lineRegex.lastIndex = 0;
    let match;
    while ((match = lineRegex.exec(line)) !== null) {
      const clean = match[0].replace(/,/g, "").replace(symbol, "").trim();
      plainSum = plainSum.add(clean);
    }
  }

  if (!changed) return val;

  // Re-serialize any table blocks that changed so column widths stay aligned
  let i = 0;
  while (i < nextLines.length) {
    if (isTableRow(nextLines[i])) {
      const start = i;
      while (i < nextLines.length && isTableRow(nextLines[i])) i++;
      const end = i;
      const blockChanged = nextLines
        .slice(start, end)
        .some((l, k) => l !== lines[start + k]);
      if (blockChanged) {
        const parsed = parseTableLenient(nextLines.slice(start, end).join("\n"));
        if (parsed) {
          const serialized = serializeTable(parsed, true).split("\n");
          for (let k = 0; k < serialized.length && start + k < end; k++) {
            nextLines[start + k] = serialized[k];
          }
        }
      }
    } else {
      i++;
    }
  }

  return nextLines.join("\n");
}
