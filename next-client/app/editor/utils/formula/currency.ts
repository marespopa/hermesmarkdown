// --- Currency-tolerant single-cell number coercion --------------------
// A formula referencing a cell like "$2,000" or "1000 RON" should still
// treat it as a number — strip any recognized currency token (any
// placement, with or without a space) and thousands separators.

export interface CurrencyDef {
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
export function detectCurrencyDef(text: string): CurrencyDef | null {
  for (let i = 0; i < CURRENCY_DEFS.length; i++) {
    if (CURRENCY_DETECT_RES[i].test(text)) return CURRENCY_DEFS[i];
  }
  return null;
}
