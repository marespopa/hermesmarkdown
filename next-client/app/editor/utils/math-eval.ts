// Safe arithmetic evaluator (no `eval`): tokenizer + recursive-descent parser.
// `evaluateMath` is the plain mode used by the `calc(…)=` shortcode; the
// inline note calculator (utils/note-calc-scan.ts) calls
// `evaluateMathExpression` with options that enable names, `%` / `of` and
// `1,234` thousands separators, plus `^` and `sqrt/round/min/max` calls.

import { evaluateMathFunction, MATH_FUNCTIONS, type MathFunction } from "./math-functions";

export type MathResolver = (name: string) => number | undefined; // name is normalized (lowercase, single spaces)

export interface MathEvalOptions {
  resolve?: MathResolver;        // enables identifier tokens; absent → identifiers fail
  percent?: boolean;             // enables `%` and `of`
  thousandsSeparators?: boolean; // enables strict `1,234` groups
  functions?: boolean;           // enables `^` and `sqrt(x)`, `round(x[, digits])`, `min(…)`, `max(…)`
}

export interface MathEvaluation {
  value: number;
  isLiteral: boolean; // one number, optional leading sign, optional trailing `%`
}

type MathToken =
  | number
  | "(" | ")" | "+" | "-" | "*" | "/" | "^" | "," | "%" | "of"
  | { type: "name"; name: string }
  | { type: "func"; name: MathFunction };

type MathNode =
  | number
  | { type: "unary"; op: "+" | "-"; value: MathNode }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: MathNode; right: MathNode }
  | { type: "call"; name: MathFunction; args: MathNode[] }
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
  // One entry per open `(`: true when it opens a function call, where `,`
  // separates arguments instead of grouping thousands.
  const parens: boolean[] = [];
  const inCall = () => parens[parens.length - 1] === true;
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

      const numberChar = options.thousandsSeparators && !inCall() ? /[0-9.,]/ : /[0-9.]/;
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
      if (char === "(") {
        const previous = tokens[tokens.length - 1];
        parens.push(typeof previous === "object" && previous.type === "func");
      } else if (char === ")") {
        parens.pop();
      }
      tokens.push(char as MathToken);
      index += 1;
      continue;
    }

    if (options.functions && (char === "^" || (char === "," && inCall()))) {
      tokens.push(char);
      index += 1;
      continue;
    }

    if (options.functions && NAME_START.test(char)) {
      // `sqrt(` etc.: a function name directly (or after gaps) before `(`.
      const word = readWord(expression, index);
      const name = word?.toLowerCase() as MathFunction | undefined;
      let cursor = index + (word?.length ?? 0);
      while (isGap(expression[cursor])) cursor += 1;
      if (name && MATH_FUNCTIONS.includes(name) && expression[cursor] === "(") {
        tokens.push({ type: "func", name });
        index = cursor;
        continue;
      }
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

// factor := ('+'|'-') factor | power
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

  return parsePower(tokens, position);
}

// power := postfix ('^' factor)?   (right-associative; -2^2 = -(2^2))
function parsePower(tokens: MathToken[], position: number): ParseResult {
  const base = parsePostfix(tokens, position);
  if (!base || tokens[base.position] !== "^") return base;
  const exponent = parseFactor(tokens, base.position + 1);
  if (!exponent) return null;
  return {
    value: { type: "binary", op: "^", left: base.value, right: exponent.value },
    position: exponent.position,
  };
}

// call := func '(' expr (',' expr)* ')'
function parseCall(tokens: MathToken[], position: number, name: MathFunction): ParseResult {
  if (tokens[position] !== "(") return null;
  const args: MathNode[] = [];
  let cursor = position;
  do {
    const arg = parseExpression(tokens, cursor + 1);
    if (!arg) return null;
    args.push(arg.value);
    cursor = arg.position;
  } while (tokens[cursor] === ",");
  if (tokens[cursor] !== ")") return null;
  return { value: { type: "call", name, args }, position: cursor + 1 };
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

// primary := number | name | call | '(' expr ')'
function parsePrimary(tokens: MathToken[], position: number): ParseResult {
  const token = tokens[position];

  if (typeof token === "number") {
    return { value: token, position: position + 1 };
  }

  if (typeof token === "object" && token.type === "func") {
    return parseCall(tokens, position + 1, token.name);
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
    case "call":
      return evaluateMathFunction(node.name, node.args.map((arg) => evaluateNode(arg, resolve)));
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
    case "^": {
      const value = left ** right;
      if (Number.isNaN(value)) throw new Error("Invalid power");
      return value;
    }
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
