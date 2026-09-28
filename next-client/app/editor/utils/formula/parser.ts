import { letterToColIndex, parseCellRef, parseRangeRef, type RangeRef } from "./addressing";
import { ParseError } from "./values";

// --- Tokenizer ----------------------------------------------------------

export type TokenType =
  | "NUMBER"
  | "STRING"
  | "CELLREF"
  | "IDENT"
  | "OP"
  | "COMPARE"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COLON"
  | "BANG"
  | "WIKILINK"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
}

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ch });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ch });
      i++;
      continue;
    }
    if (ch === ":") {
      tokens.push({ type: "COLON", value: ch });
      i++;
      continue;
    }
    if (ch === "!") {
      tokens.push({ type: "BANG", value: ch });
      i++;
      continue;
    }
    if (ch === "[" && src[i + 1] === "[") {
      const end = src.indexOf("]]", i + 2);
      if (end === -1) throw new ParseError("#VALUE!");
      tokens.push({ type: "WIKILINK", value: src.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < n && src[j] !== '"') {
        s += src[j];
        j++;
      }
      tokens.push({ type: "STRING", value: s });
      i = j + 1;
      continue;
    }
    if (ch === "<" || ch === ">") {
      if (src[i + 1] === "=") {
        tokens.push({ type: "COMPARE", value: ch + "=" });
        i += 2;
        continue;
      }
      if (ch === "<" && src[i + 1] === ">") {
        tokens.push({ type: "COMPARE", value: "<>" });
        i += 2;
        continue;
      }
      tokens.push({ type: "COMPARE", value: ch });
      i++;
      continue;
    }
    if (ch === "=") {
      tokens.push({ type: "COMPARE", value: "=" });
      i++;
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z]/.test(src[j])) j++;
      const letters = src.slice(i, j);
      if (j < n && /\d/.test(src[j])) {
        let k = j;
        while (k < n && /\d/.test(src[k])) k++;
        tokens.push({ type: "CELLREF", value: letters + src.slice(j, k) });
        i = k;
        continue;
      }
      tokens.push({ type: "IDENT", value: letters });
      i = j;
      continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(src[i + 1] || ""))) {
      let j = i;
      while (j < n && /[\d.]/.test(src[j])) j++;
      let numStr = src.slice(i, j);
      if (j < n && src[j] === "%") {
        numStr = String(parseFloat(numStr) / 100);
        j++;
      }
      tokens.push({ type: "NUMBER", value: numStr });
      i = j;
      continue;
    }
    // Unrecognized character — surface as #VALUE! at parse time.
    throw new ParseError("#VALUE!");
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

// --- AST & parser ---------------------------------------------------------

export type Node =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "ref"; row: number; col: number }
  | ({ kind: "range" } & RangeRef)
  | { kind: "col"; col: number }
  | { kind: "tableref"; tableName: string; row: number; col: number }
  | { kind: "tablecol"; tableName: string; col: number }
  | { kind: "filetableref"; noteRef: string; row: number; col: number }
  | { kind: "filetablecol"; noteRef: string; col: number }
  | { kind: "unary"; op: "-"; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

export function parseFormulaTokens(tokens: Token[]): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const advance = () => tokens[pos++];
  const expect = (type: TokenType) => {
    if (peek().type !== type) throw new ParseError("#VALUE!");
    return advance();
  };

  function parsePrimary(): Node {
    const t = peek();
    if (t.type === "NUMBER") {
      advance();
      return { kind: "num", value: parseFloat(t.value) };
    }
    if (t.type === "STRING") {
      advance();
      // Quoted cross-table ref: "Heading Name"!C2 or "Heading Name"!B
      if (peek().type === "BANG") {
        advance(); // consume !
        const next = peek();
        if (next.type === "CELLREF") {
          advance();
          const ref = parseCellRef(next.value);
          if (!ref) throw new ParseError("#REF!");
          return { kind: "tableref", tableName: t.value, row: ref.row, col: ref.col };
        }
        if (next.type === "IDENT") {
          advance();
          return { kind: "tablecol", tableName: t.value, col: letterToColIndex(next.value) };
        }
        throw new ParseError("#REF!");
      }
      return { kind: "str", value: t.value };
    }
    if (t.type === "IDENT") {
      const upper = t.value.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        advance();
        return { kind: "bool", value: upper === "TRUE" };
      }
      advance();
      if (peek().type === "LPAREN") {
        advance();
        const args: Node[] = [];
        if (peek().type !== "RPAREN") {
          args.push(parseArg());
          while (peek().type === "COMMA") {
            advance();
            args.push(parseArg());
          }
        }
        expect("RPAREN");
        return { kind: "call", name: upper, args };
      }
      // Cross-table reference: HeadingName!C2 or HeadingName!B (column)
      if (peek().type === "BANG") {
        advance(); // consume !
        const next = peek();
        if (next.type === "CELLREF") {
          advance();
          const ref = parseCellRef(next.value);
          if (!ref) throw new ParseError("#REF!");
          return { kind: "tableref", tableName: t.value, row: ref.row, col: ref.col };
        }
        if (next.type === "IDENT") {
          advance();
          return { kind: "tablecol", tableName: t.value, col: letterToColIndex(next.value) };
        }
        throw new ParseError("#REF!");
      }
      // Bare A-Z identifier (not a bool) = whole-column reference, e.g. SUM(B)
      if (/^[A-Za-z]+$/.test(t.value) && upper !== "TRUE" && upper !== "FALSE") {
        return { kind: "col", col: letterToColIndex(upper) };
      }
      throw new ParseError("#NAME?");
    }
    if (t.type === "CELLREF") {
      advance();
      const ref = parseCellRef(t.value);
      if (!ref) throw new ParseError("#REF!");
      return { kind: "ref", row: ref.row, col: ref.col };
    }
    if (t.type === "WIKILINK") {
      advance();
      if (peek().type !== "BANG") throw new ParseError("#REF!");
      advance(); // consume !
      const next = peek();
      if (next.type === "CELLREF") {
        advance();
        const ref = parseCellRef(next.value);
        if (!ref) throw new ParseError("#REF!");
        return { kind: "filetableref", noteRef: t.value, row: ref.row, col: ref.col };
      }
      if (next.type === "IDENT") {
        advance();
        return { kind: "filetablecol", noteRef: t.value, col: letterToColIndex(next.value) };
      }
      throw new ParseError("#REF!");
    }
    if (t.type === "LPAREN") {
      advance();
      const e = parseExpr();
      expect("RPAREN");
      return e;
    }
    if (t.type === "OP" && t.value === "-") {
      advance();
      return { kind: "unary", op: "-", arg: parseUnary() };
    }
    throw new ParseError("#VALUE!");
  }

  function parseUnary(): Node {
    if (peek().type === "OP" && peek().value === "-") {
      advance();
      return { kind: "unary", op: "-", arg: parseUnary() };
    }
    return parsePrimary();
  }

  function parseTerm(): Node {
    let left = parseUnary();
    while (peek().type === "OP" && (peek().value === "*" || peek().value === "/")) {
      const op = advance().value;
      left = { kind: "binary", op, left, right: parseUnary() };
    }
    return left;
  }

  function parseAdditive(): Node {
    let left = parseTerm();
    while (peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
      const op = advance().value;
      left = { kind: "binary", op, left, right: parseTerm() };
    }
    return left;
  }

  function parseComparison(): Node {
    let left = parseAdditive();
    while (peek().type === "COMPARE") {
      const op = advance().value;
      left = { kind: "binary", op, left, right: parseAdditive() };
    }
    return left;
  }

  function parseExpr(): Node {
    return parseComparison();
  }

  // Function arguments may be a bare range (only valid directly as an arg).
  function parseArg(): Node {
    if (
      peek().type === "CELLREF" &&
      tokens[pos + 1]?.type === "COLON" &&
      tokens[pos + 2]?.type === "CELLREF"
    ) {
      const a = advance();
      advance(); // colon
      const b = advance();
      const range = parseRangeRef(`${a.value}:${b.value}`);
      if (!range) throw new ParseError("#REF!");
      return { kind: "range", ...range };
    }
    return parseExpr();
  }

  const result = parseExpr();
  if (peek().type !== "EOF") throw new ParseError("#VALUE!");
  return result;
}
