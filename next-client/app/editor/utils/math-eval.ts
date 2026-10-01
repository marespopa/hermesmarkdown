// Safe arithmetic evaluator (no `eval`): tokenizer + recursive-descent parser.
// `evaluateMath` is the plain mode used by the `calc(…)=` shortcode; the
// inline note calculator (utils/note-calc-scan.ts) calls
// `evaluateMathExpression` with options that enable names, `%` / `of` and
// `1,234` thousands separators.

export type MathResolver = (name: string) => number | undefined; // name is normalized (lowercase, single spaces)

export interface MathEvalOptions {
  resolve?: MathResolver;        // enables identifier tokens; absent → identifiers fail
  percent?: boolean;             // enables `%` and `of`
  thousandsSeparators?: boolean; // enables strict `1,234` groups
}

export interface MathEvaluation {
  value: number;
  isLiteral: boolean; // one number, optional leading sign, optional trailing `%`
}

type MathToken = number | "(" | ")" | "+" | "-" | "*" | "/" | "%" | "of" | { type: "name"; name: string };

type MathNode =
  | number
  | { type: "unary"; op: "+" | "-"; value: MathNode }
  | { type: "binary"; op: "+" | "-" | "*" | "/"; left: MathNode; right: MathNode }
  | { type: "name"; name: string }
  | { type: "percent"; value: MathNode }
  | { type: "of"; percent: MathNode; value: MathNode };

type ParseResult = { value: MathNode; position: number } | null;

const WORD = /[A-Za-z_]\w*/y;
const NAME_START = /[A-Za-z_]/;
const GROUPED_NUMBER = /^\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

export function normalizeMathName(raw: string): string {
  return raw.trim().split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

function readWord(expression: string, index: number): string | null {
  WORD.lastIndex = index;
  const match = WORD.exec(expression);
  return match ? match[0] : null;
}

function tokenizeMath(expression: string, options: MathEvalOptions = {}): MathToken[] | null {
  const tokens: MathToken[] = [];
  const numberChar = options.thousandsSeparators ? /[0-9.,]/ : /[0-9.]/;
  // Plain mode (`calc(…)=`) keeps skipping spaces only; the note calculator
  // also accepts tabs between tokens.
  const lenient = Boolean(options.resolve || options.percent || options.thousandsSeparators);
  const isGap = (char: string | undefined) => char === " " || (lenient && char === "\t");
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (isGap(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let number = char;
      index += 1;

      while (index < expression.length && numberChar.test(expression[index])) {
        number += expression[index];
        index += 1;
      }

      if (number.includes(",")) {
        if (!GROUPED_NUMBER.test(number)) return null;
        number = number.replace(/,/g, "");
      }

      if ((number.match(/\./g) || []).length > 1 || number === ".") {
        return null;
      }

      tokens.push(Number(number));
      continue;
    }

    if (["(", ")", "+", "-", "*", "/"].includes(char)) {
      tokens.push(char as MathToken);
      index += 1;
      continue;
    }

    if (char === "%" && options.percent) {
      tokens.push("%");
      index += 1;
      continue;
    }

    if (options.resolve && NAME_START.test(char)) {
      // A name is a run of words joined by spaces; the word `of` always
      // ends it and becomes its own token.
      const words: string[] = [];
      let cursor = index;
      for (;;) {
        const word = readWord(expression, cursor);
        if (!word || word.toLowerCase() === "of") break;
        words.push(word);
        cursor += word.length;
        index = cursor;
        while (isGap(expression[cursor])) cursor += 1;
        if (!NAME_START.test(expression[cursor] ?? "")) break;
      }
      if (words.length > 0) {
        tokens.push({ type: "name", name: normalizeMathName(words.join(" ")) });
        continue;
      }
      if (!options.percent) return null;
      tokens.push("of");
      index += 2;
      continue;
    }

    return null;
  }

  return tokens;
}

function parseExpression(tokens: MathToken[], position = 0): ParseResult {
  const term = parseTerm(tokens, position);
  if (!term) return null;

  let current: MathNode = term.value;
  let nextPosition = term.position;

  while (nextPosition < tokens.length && (tokens[nextPosition] === "+" || tokens[nextPosition] === "-")) {
    const op = tokens[nextPosition] as "+" | "-";
    nextPosition += 1;

    const right = parseTerm(tokens, nextPosition);
    if (!right) return null;

    current = {
      type: "binary",
      op,
      left: current,
      right: right.value,
    };
    nextPosition = right.position;
  }

  return { value: current, position: nextPosition };
}

function parseTerm(tokens: MathToken[], position = 0): ParseResult {
  const factor = parseFactor(tokens, position);
  if (!factor) return null;

  let current: MathNode = factor.value;
  let nextPosition = factor.position;

  while (nextPosition < tokens.length && (tokens[nextPosition] === "*" || tokens[nextPosition] === "/")) {
    const op = tokens[nextPosition] as "*" | "/";
    nextPosition += 1;

    const right = parseFactor(tokens, nextPosition);
    if (!right) return null;

    current = {
      type: "binary",
      op,
      left: current,
      right: right.value,
    };
    nextPosition = right.position;
  }

  return { value: current, position: nextPosition };
}

// factor := ('+'|'-') factor | postfix
function parseFactor(tokens: MathToken[], position = 0): ParseResult {
  const token = tokens[position];

  if (token === "+" || token === "-") {
    const value = parseFactor(tokens, position + 1);
    if (!value) return null;
    return {
      value: { type: "unary", op: token, value: value.value },
      position: value.position,
    };
  }

  return parsePostfix(tokens, position);
}

// postfix := primary ('%' ('of' factor)?)?
function parsePostfix(tokens: MathToken[], position: number): ParseResult {
  const primary = parsePrimary(tokens, position);
  if (!primary || tokens[primary.position] !== "%") return primary;

  const afterPercent = primary.position + 1;
  if (tokens[afterPercent] !== "of") {
    return { value: { type: "percent", value: primary.value }, position: afterPercent };
  }

  const value = parseFactor(tokens, afterPercent + 1);
  if (!value) return null;
  return { value: { type: "of", percent: primary.value, value: value.value }, position: value.position };
}

// primary := number | name | '(' expr ')'
function parsePrimary(tokens: MathToken[], position: number): ParseResult {
  const token = tokens[position];

  if (typeof token === "number") {
    return { value: token, position: position + 1 };
  }

  if (typeof token === "object") {
    return { value: { type: "name", name: token.name }, position: position + 1 };
  }

  if (token === "(") {
    const expression = parseExpression(tokens, position + 1);
    if (!expression) return null;
    if (tokens[expression.position] !== ")") return null;
    return { value: expression.value, position: expression.position + 1 };
  }

  return null;
}

function evaluateNode(node: MathNode, resolve?: MathResolver): number {
  if (typeof node === "number") {
    return node;
  }

  switch (node.type) {
    case "unary": {
      const value = evaluateNode(node.value, resolve);
      return node.op === "-" ? -value : value;
    }
    case "name": {
      const value = resolve?.(node.name);
      if (value === undefined) throw new Error(`Undefined name: ${node.name}`);
      return value;
    }
    case "percent":
      return evaluateNode(node.value, resolve) / 100;
    case "of":
      return (evaluateNode(node.percent, resolve) / 100) * evaluateNode(node.value, resolve);
    default:
      break;
  }

  const left = evaluateNode(node.left, resolve);

  // `450 + 15%` → 450 * 1.15: a direct percent operand of +/- is relative
  // to the left-hand side.
  if ((node.op === "+" || node.op === "-") && typeof node.right === "object" && node.right.type === "percent") {
    const fraction = evaluateNode(node.right.value, resolve) / 100;
    return left * (node.op === "+" ? 1 + fraction : 1 - fraction);
  }

  const right = evaluateNode(node.right, resolve);

  switch (node.op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) {
        throw new Error("Division by zero");
      }
      return left / right;
    default:
      throw new Error("Unsupported operator");
  }
}

function isLiteralTokens(tokens: MathToken[]): boolean {
  let start = 0;
  let end = tokens.length;
  if (tokens[start] === "+" || tokens[start] === "-") start += 1;
  if (tokens[end - 1] === "%") end -= 1;
  return end - start === 1 && typeof tokens[start] === "number";
}

export function evaluateMathExpression(expression: string, options: MathEvalOptions = {}): MathEvaluation | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const tokens = tokenizeMath(trimmed, options);
  if (!tokens || tokens.length === 0) return null;

  const parsed = parseExpression(tokens, 0);
  if (!parsed || parsed.position !== tokens.length) {
    return null;
  }

  try {
    return { value: evaluateNode(parsed.value, options.resolve), isLiteral: isLiteralTokens(tokens) };
  } catch {
    return null;
  }
}

export function evaluateMath(expression: string): number | null {
  return evaluateMathExpression(expression)?.value ?? null;
}
