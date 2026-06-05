import currency from "currency.js";

const CURRENCY_MAP: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  RON: "lei",
};

const REGEX_CACHE: Record<string, RegExp> = {};

function getLineRegex(symbol: string): RegExp {
  if (REGEX_CACHE[symbol]) return REGEX_CACHE[symbol];
  const escapedSymbol = symbol.replace(/[.$*+?()[\]{}|]/g, "\\$&");
  return (REGEX_CACHE[symbol] = new RegExp(`-?${escapedSymbol}[\\d,]+(?:\\.\\d+)?`, "g"));
}

/**
 * Automatically sums up currency values in a markdown string.
 * When it encounters a line starting with "Total:", it outputs the sum
 * of all values found since the last "Total:" or the start of the file.
 * 
 * Supports commas (e.g., $4,200.00) and multiple configured currencies.
 */
export function runAutoBudget(val: string, currencyCode: string = "USD"): string {
  // Fast path: if there are no "Total:" lines, we don't need to do anything.
  if (!val.includes("Total:")) return val;

  const lines = val.split("\n");
  let currentSum = currency(0);
  const symbol = CURRENCY_MAP[currencyCode] || "$";
  const lineRegex = getLineRegex(symbol);

  let changed = false;
  const nextLines = lines.map((line) => {
    // Check for Total: line using a simple includes check first for speed
    if (line.includes("Total:")) {
      const totalMatch = line.match(/^(\s*)Total:/);
      if (totalMatch) {
        const leadingWhitespace = totalMatch[1];
        const formattedTotal = currentSum.format({ symbol, separator: "," });
        const newLine = `${leadingWhitespace}Total: ${formattedTotal}`;

        currentSum = currency(0);
        
        if (newLine !== line) {
          changed = true;
          return newLine;
        }
        return line;
      }
    }

    // Use exec loop for better performance
    lineRegex.lastIndex = 0;
    let match;
    while ((match = lineRegex.exec(line)) !== null) {
      // Remove commas for currency.js parsing
      const cleanValue = match[0].replace(/,/g, "");
      currentSum = currentSum.add(cleanValue);
    }
    
    return line;
  });

  return changed ? nextLines.join("\n") : val;
}
