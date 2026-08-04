type MathToken = number | "(" | ")" | "+" | "-" | "*" | "/";

type MathNode = number | { type: "unary"; op: "+" | "-"; value: MathNode } | { type: "binary"; op: "+" | "-" | "*" | "/"; left: MathNode; right: MathNode };

function tokenizeMath(expression: string): MathToken[] | null {
  const tokens: MathToken[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (char === " ") {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let number = char;
      index += 1;

      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        number += expression[index];
        index += 1;
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

    return null;
  }

  return tokens;
}

function parseExpression(tokens: MathToken[], position = 0): { value: MathNode; position: number } | null {
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

function parseTerm(tokens: MathToken[], position = 0): { value: MathNode; position: number } | null {
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

function parseFactor(tokens: MathToken[], position = 0): { value: MathNode; position: number } | null {
  const token = tokens[position];

  if (token === "+" || token === "-") {
    const value = parseFactor(tokens, position + 1);
    if (!value) return null;
    return {
      value: { type: "unary", op: token, value: value.value },
      position: value.position,
    };
  }

  if (typeof token === "number") {
    return { value: token, position: position + 1 };
  }

  if (token === "(") {
    const expression = parseExpression(tokens, position + 1);
    if (!expression) return null;
    if (tokens[expression.position] !== ")") return null;
    return { value: expression.value, position: expression.position + 1 };
  }

  return null;
}

function evaluateNode(node: MathNode): number {
  if (typeof node === "number") {
    return node;
  }

  if (node.type === "unary") {
    const value = evaluateNode(node.value);
    return node.op === "-" ? -value : value;
  }

  const left = evaluateNode(node.left);
  const right = evaluateNode(node.right);

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

export function evaluateMath(expression: string): number | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const tokens = tokenizeMath(trimmed);
  if (!tokens || tokens.length === 0) return null;

  const parsed = parseExpression(tokens, 0);
  if (!parsed || parsed.position !== tokens.length) {
    return null;
  }

  try {
    return evaluateNode(parsed.value);
  } catch {
    return null;
  }
}
