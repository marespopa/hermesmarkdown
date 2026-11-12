// Natural-language pre-pass for the inline note calculator. Pure, no DOM.
// The scanner (utils/note-calc-scan.ts) calls it only when a line's plain
// math fails, so lines that already evaluated keep their result. It
// rewrites phrasing into the syntax utils/math-eval.ts parses:
//   "Total server cost: 3 nodes multiplied by 45 plus 19% VAT"
//   → "3 * 45 + 19 %"  (= 160.65)
// Steps, in order: keep the last sentence part (after `: `, `? ` …) → take out a currency
// or unit → ordered phrase rules → word pass (operator words, filler words,
// unit nouns, a right-to-left scan that stops at the first prose word).

export interface NormalizedMath {
  expr: string;
  unit?: string;            // "$", "RON", … shown with the result
  isPercentResult?: boolean; // "25 is what % of 200" → shown as "12.5%"
}

// True when a (normalized) name is a variable in scope; such words are never
// rewritten or dropped.
export type KnownName = (name: string) => boolean;

type Rule = [RegExp, string | ((...match: string[]) => string)];

const NUMBER = String.raw`\d+(?:,\d{3})*(?:\.\d+)?`;
const OPERAND = String.raw`(${NUMBER}|\([^()]*\)|[A-Za-z_]\w*)`;
const SCALE: Record<string, string> = { k: "1000", thousand: "1000", m: "1000000", million: "1000000", b: "1000000000", billion: "1000000000" };

const CURRENCY_SYMBOL = /[$€£]/;
const CURRENCY_CODE = /\b(RON|lei|USD|EUR|GBP)\b/i;
const HEX = /\b0x[0-9a-f]+\b/i;
const SENTENCE_BREAK = /[:;?!](?=\s|$)/;
const PERCENT_SHARE = /^(.+?)\s+(?:as\s+an?|is\s+what)\s*%\s+of\s+(.+)$/i;

// Most specific first.
const RULES: Rule[] = [
  // Typos and multi-word operators.
  [/\bmultipl(?:i|ie|ite|e)?d\s+by\b/gi, " * "],
  [/\bd[ie]v[ie]?ded\s+by\b/gi, " / "],
  [/\bsplit\s+by\b/gi, " / "],
  [/\badded\s+to\b/gi, " + "],
  // "20 percent" → "20%"; a bare "percent" → "%".
  [/(\d|\))\s*p(?:er|re)cent(?:age)?\b/gi, "$1%"],
  [/\bp(?:er|re)cent(?:age)?\b/gi, "%"],
  // Scale suffixes, before roots and powers so "sqrt of 5k" works.
  [new RegExp(String.raw`\b(${NUMBER})(k|m|b)\b`, "gi"), (_, n, s) => `(${n} * ${SCALE[s.toLowerCase()]})`],
  [new RegExp(String.raw`\b(${NUMBER})\s+(thousand|million|billion)\b`, "gi"), (_, n, s) => `(${n} * ${SCALE[s.toLowerCase()]})`],
  // Roots and powers.
  [new RegExp(String.raw`\b(?:square\s+root|sqrt)\s+(?:of\s+)?${OPERAND}`, "gi"), (_, x) => `sqrt(${x})`],
  [/\s*\bsquared\b/gi, "^2"],
  [/\s*\bcubed\b/gi, "^3"],
  // "5 x 4" / "5x4", never hex ("0x1f").
  [/(\d+(?:\.\d+)?)(\s*)x(\s*)(?=\d)/gi, (whole, n, before, after) => (n === "0" && !before && !after ? whole : `${n} * `)],
];

const OPERATOR_WORDS: Record<string, string> = {
  times: "*", x: "*",
  over: "/",
  plus: "+", and: "+",
  minus: "-", less: "-", subtract: "-",
};
const NOISE_WORDS = new Set(["vat", "tax", "for", "each", "approx", "approximately", "roughly", "about", "around"]);
const FUNCTION_WORDS = new Set(["sqrt", "round", "min", "max"]);

type Role = "num" | "sym" | "op" | "of" | "func" | "name" | "noise" | "unit" | "prose";
interface Item { role: Role; text: string }

const TOKEN = new RegExp(String.raw`${NUMBER}|\.\d+|[A-Za-z_]\w*|[-+*/^%(),]|\S`, "g");

function lex(span: string): string[] {
  return span.match(TOKEN) ?? [];
}

function classify(tokens: string[], isKnown: KnownName): Item[] | null {
  const items: Item[] = [];
  const isWord = (token: string) => /^[A-Za-z_]/.test(token);
  const plain = (token: string) => {
    const lower = token.toLowerCase();
    if (isKnown(lower)) return true;
    return !(lower in OPERATOR_WORDS || lower === "of" || NOISE_WORDS.has(lower) || FUNCTION_WORDS.has(lower));
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const lower = token.toLowerCase();
    if (/^[\d.]/.test(token)) { items.push({ role: "num", text: token }); continue; }
    if (!isWord(token)) {
      if (!/^[-+*/^%(),]$/.test(token)) return null;
      items.push({ role: "sym", text: token });
      continue;
    }
    if (!plain(token)) {
      if (FUNCTION_WORDS.has(lower) && tokens[i + 1] === "(") items.push({ role: "func", text: lower });
      else if (lower in OPERATOR_WORDS) items.push({ role: "op", text: lower });
      else if (lower === "of") items.push({ role: "of", text: "of" });
      else if (NOISE_WORDS.has(lower)) items.push({ role: "noise", text: token });
      else items.push({ role: "prose", text: token });
      continue;
    }
    // A run of plain words: one known (multi-word) name, or words on their own.
    let end = i;
    while (end + 1 < tokens.length && isWord(tokens[end + 1]) && plain(tokens[end + 1])) end += 1;
    const run = tokens.slice(i, end + 1);
    if (isKnown(run.join(" ").toLowerCase())) {
      items.push({ role: "name", text: run.join(" ") });
    } else {
      for (const word of run) {
        const previous = items[items.length - 1];
        // A noun right after a number, `%` or `)` is a unit ("3 nodes").
        const unit = previous && (previous.role === "num" || previous.role === "unit" || previous.text === "%" || previous.text === ")");
        items.push({ role: isKnown(word.toLowerCase()) ? "name" : unit ? "unit" : "prose", text: word });
      }
    }
    i = end;
  }
  return items;
}

const endsOperand = (item?: Item) => !!item && (item.role === "num" || item.role === "name" || item.text === ")" || item.text === "%");
const startsOperand = (item?: Item) =>
  !!item && (item.role === "num" || item.role === "name" || item.role === "func" || item.text === "(" || item.text === "-" || item.text === "+");

function normalizeSpan(raw: string, isKnown: KnownName): string | null {
  let span = raw;
  for (const [pattern, replacement] of RULES) {
    span = typeof replacement === "string" ? span.replace(pattern, replacement) : span.replace(pattern, replacement);
  }

  const classified = classify(lex(span), isKnown);
  if (!classified) return null;

  // Right-to-left: the math is what follows the last prose word.
  let start = classified.length;
  while (start > 0 && classified[start - 1].role !== "prose") start -= 1;
  const items = classified.slice(start).filter((item) => item.role !== "noise" && item.role !== "unit");
  if (!items.some((item) => item.role === "num" || item.role === "name")) return null;

  const out: string[] = [];
  items.forEach((item, i) => {
    if (item.role !== "op") {
      out.push(item.text);
      return;
    }
    const leadingMinus = i === 0 && item.text === "minus";
    if (!leadingMinus && !(endsOperand(items[i - 1]) && startsOperand(items[i + 1]))) {
      out.push("\u0000"); // unflanked operator word: make the line fail
      return;
    }
    out.push(OPERATOR_WORDS[item.text]);
  });
  if (out.includes("\u0000")) return null;
  return out.join(" ");
}

export function normalizeMathExpression(raw: string, isKnown: KnownName = () => false): NormalizedMath | null {
  if (HEX.test(raw)) return null; // "0x1f" is code, not "0 × 1f"
  let text = raw.split(SENTENCE_BREAK).filter((segment) => segment.trim()).pop() ?? "";

  let unit: string | undefined;
  const symbol = CURRENCY_SYMBOL.exec(text);
  const code = CURRENCY_CODE.exec(text);
  if (symbol && (!code || symbol.index < code.index)) unit = symbol[0];
  else if (code) unit = code[1];
  text = text.replace(/[$€£]/g, " ").replace(new RegExp(CURRENCY_CODE.source, "gi"), " ");

  const share = PERCENT_SHARE.exec(text.replace(/\bp(?:er|re)cent(?:age)?\b/gi, "%"));
  if (share) {
    const part = normalizeSpan(share[1], isKnown);
    const whole = normalizeSpan(share[2], isKnown);
    if (part === null || whole === null) return null;
    return { expr: `(${part}) / (${whole}) * 100`, unit, isPercentResult: true };
  }

  const expr = normalizeSpan(text, isKnown);
  return expr === null ? null : { expr, unit };
}

// The label for a normalized result: "$120", "160.65 RON", "12.5%".
export function decorateNoteCalcLabel(label: string, normalized: NormalizedMath): string {
  let text = normalized.isPercentResult ? `${label}%` : label;
  if (normalized.unit) {
    if (CURRENCY_SYMBOL.test(normalized.unit)) {
      text = text.startsWith("-") ? `-${normalized.unit}${text.slice(1)}` : `${normalized.unit}${text}`;
    } else {
      text = `${text} ${normalized.unit}`;
    }
  }
  return text;
}
