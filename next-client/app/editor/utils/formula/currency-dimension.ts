import type { Node } from "./parser";

// How many times a formula's result is "money", like units in physics: an
// amount is 1, a plain number 0, so RON / RON is a ratio (0) while
// RON * 10% stays an amount (1) and RON * RON (2) is no currency at all.
// The result is formatted with the currency only at exactly 1.
// `isMoney(node)` says whether a reference (a cell, range or column) read a
// currency-tagged value while the formula was evaluated.

const REFERENCE_KINDS = new Set(["ref", "range", "col", "tableref", "tablecol", "filetableref", "filetablecol"]);
const COMPARISONS = new Set(["=", "<>", "<", ">", "<=", ">="]);
// Functions whose result is a count, a truth value or text, never an amount.
const UNITLESS_FUNCTIONS = new Set(["COUNT", "COUNTA", "AND", "OR", "NOT", "CONCAT"]);

// Adding or picking between an amount and a plain number keeps the amount
// (B2 + 5, MAX(B2:B5), IF(x, B2, 0)).
const either = (powers: number[]) => powers.find((power) => power !== 0) ?? 0;

export function moneyPower(node: Node, isMoney: (node: Node) => boolean): number {
  if (REFERENCE_KINDS.has(node.kind)) return isMoney(node) ? 1 : 0;
  switch (node.kind) {
    case "unary":
      return moneyPower(node.arg, isMoney);
    case "binary": {
      if (COMPARISONS.has(node.op)) return 0;
      const left = moneyPower(node.left, isMoney);
      const right = moneyPower(node.right, isMoney);
      if (node.op === "*") return left + right;
      if (node.op === "/") return left - right;
      return either([left, right]);
    }
    case "call": {
      if (UNITLESS_FUNCTIONS.has(node.name)) return 0;
      // IF's condition is a truth value; its result is one of the branches.
      const args = node.name === "IF" ? node.args.slice(1) : node.name === "ROUND" ? node.args.slice(0, 1) : node.args;
      return either(args.map((arg) => moneyPower(arg, isMoney)));
    }
    default:
      return 0;
  }
}
