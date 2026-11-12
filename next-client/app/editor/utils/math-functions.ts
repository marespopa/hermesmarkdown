// Function calls for the note calculator's evaluator (utils/math-eval.ts,
// enabled with the `functions` option). Throws on bad arity or domain so the
// evaluator returns null for the line.

export type MathFunction = "sqrt" | "round" | "min" | "max";

export const MATH_FUNCTIONS: readonly MathFunction[] = ["sqrt", "round", "min", "max"];

export function evaluateMathFunction(name: MathFunction, args: number[]): number {
  switch (name) {
    case "sqrt":
      if (args.length !== 1 || args[0] < 0) throw new Error("Invalid sqrt");
      return Math.sqrt(args[0]);
    case "round": {
      if (args.length > 2 || (args.length === 2 && !Number.isInteger(args[1]))) throw new Error("Invalid round");
      const scale = 10 ** (args[1] ?? 0);
      return Math.round(args[0] * scale) / scale;
    }
    case "min":
      return Math.min(...args);
    case "max":
      return Math.max(...args);
  }
}
