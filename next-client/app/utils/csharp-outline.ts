// A C# file's outline. CodeMirror reads C# with a legacy mode (no syntax
// tree), so this scans the text: comments, strings and preprocessor lines
// are blanked, then braces give the nesting. Namespaces (block and
// file-scoped), types (class, struct, interface, record, enum, delegate),
// their members (constructors, methods, operators, properties, indexers,
// events, fields, constants) and enum values are listed, up to level 3.
// Code inside a method or property body is never read for symbols.
import type { OutlineHeading, SymbolKind } from "./markdown-outline";

type Scope = "namespace" | "type" | "enum" | "body";
interface Frame { scope: Scope; level: number }
interface Found { kind: SymbolKind; name: string; scope: Scope }

const TYPE = /\b(class|struct|interface|record|enum)\b(?:\s+(class|struct))?\s+(@?[A-Za-z_]\w*)/;
const TYPE_KINDS: Record<string, SymbolKind> = { class: "class", record: "class", struct: "struct", interface: "interface", enum: "enum" };
// Words a `(` can follow that don't name a method (statements, and the
// modifiers before a tuple return type).
const NOT_NAMES = new Set([
  "if", "for", "foreach", "while", "switch", "using", "lock", "catch", "return", "new", "typeof", "nameof", "sizeof",
  "default", "base", "this", "when", "checked", "unchecked", "public", "private", "protected", "internal", "static",
  "async", "override", "virtual", "abstract", "sealed", "readonly", "extern", "unsafe", "partial", "required",
]);
const NAME_AT_END = /(~?@?[A-Za-z_]\w*)\s*$/;
const MAX_ITEMS = 1000;
const MAX_LABEL = 60;

const clip = (text: string) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text);

// The text with comments, strings and character literals blanked and
// preprocessor lines dropped, keeping every newline (so lines still count).
export function blankCSharp(text: string): string {
  let out = "";
  let i = 0;
  let lineStart = true;
  const n = text.length;
  const skip = (to: number) => {
    const newlines = text.slice(i, to).split("\n").length - 1;
    i = to;
    return "\n".repeat(newlines);
  };
  while (i < n) {
    const c = text[i];
    if (c === "\n") { out += c; i++; lineStart = true; continue; }
    if (lineStart && (c === " " || c === "\t")) { out += c; i++; continue; }
    if (lineStart && c === "#") { while (i < n && text[i] !== "\n") i++; continue; }
    lineStart = false;
    if (c === "/" && text[i + 1] === "/") { while (i < n && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      out += " " + skip(end < 0 ? n : end + 2);
      continue;
    }
    const quote = c === '"' || c === "$" || c === "@" ? /^[$@]{0,3}("{3,}|")/.exec(text.slice(i, i + 12)) : null;
    if (quote) {
      const verbatim = quote[0].includes("@");
      let j = i + quote[0].length;
      if (quote[1].length >= 3) {
        const end = text.indexOf(quote[1], j);
        j = end < 0 ? n : end + quote[1].length;
      } else {
        while (j < n) {
          const ch = text[j];
          if (ch === "\\" && !verbatim) { j += 2; continue; }
          if (ch === '"') {
            if (verbatim && text[j + 1] === '"') { j += 2; continue; }
            j++;
            break;
          }
          if (ch === "\n" && !verbatim) break;
          j++;
        }
      }
      out += '""' + skip(Math.min(j, n));
      continue;
    }
    if (c === "'") {
      const close = text.indexOf("'", i + (text[i + 1] === "\\" ? 3 : 2));
      if (close > 0 && close - i <= 10) { out += "''"; i = close + 1; continue; }
    }
    out += c;
    i++;
  }
  return out;
}

// Drops leading attributes (`[Serializable] [Obsolete("x")] public …`).
function stripAttributes(header: string): string {
  let h = header.trim();
  while (h.startsWith("[")) {
    let depth = 0;
    let end = -1;
    for (let k = 0; k < h.length; k++) {
      if (h[k] === "[") depth++;
      else if (h[k] === "]" && --depth === 0) { end = k; break; }
    }
    if (end < 0) return "";
    h = h.slice(end + 1).trim();
  }
  return h;
}

// Where the declaration ends: a top-level `=` (an initializer) or `=>`
// (an expression body), not one inside a parameter list.
function cutDeclaration(h: string): { decl: string; arrow: boolean } {
  let depth = 0;
  for (let k = 0; k < h.length; k++) {
    const c = h[k];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "=" && depth === 0 && !"=!<>".includes(h[k - 1] ?? " ")) {
      if (h[k + 1] === "=") { k++; continue; }
      return { decl: h.slice(0, k).trim(), arrow: h[k + 1] === ">" };
    }
  }
  return { decl: h, arrow: false };
}

const withoutGenerics = (text: string) => {
  let out = text;
  for (let prev = ""; prev !== out; ) { prev = out; out = out.replace(/<[^<>()]*>/g, ""); }
  return out;
};

// The symbol a declaration header names, given what holds it and how it
// ends (`{` opens a body, `;` ends it), or null for anything else.
function classify(raw: string, holder: Scope | "root", end: "{" | ";"): Found | null {
  const h = stripAttributes(raw);
  if (!h) return null;
  const namespace = /^namespace\s+(@?[\w.]+)/.exec(h);
  if (namespace) return holder === "root" || holder === "namespace" ? { kind: "module", name: namespace[1], scope: "namespace" } : null;
  if (holder === "body" || holder === "enum") return null;
  const type = TYPE.exec(h);
  const paren = h.indexOf("(");
  if (type && (paren < 0 || type.index < paren)) {
    const kind = type[1] === "record" && type[2] === "struct" ? "struct" : TYPE_KINDS[type[1]];
    return { kind, name: type[3], scope: kind === "enum" ? "enum" : "type" };
  }
  const { decl, arrow } = cutDeclaration(h);
  const plain = withoutGenerics(decl);
  if (/\bdelegate\b/.test(plain)) {
    const name = NAME_AT_END.exec(plain.slice(0, plain.indexOf("(") >= 0 ? plain.indexOf("(") : undefined));
    return name ? { kind: "type", name: name[1], scope: "body" } : null;
  }
  // Members only inside a type (top-level statements aren't symbols).
  if (holder !== "type") return null;
  const operator = /\boperator\s*([^\s(]+|\w+)/.exec(plain);
  if (operator) return { kind: "method", name: `operator ${operator[1]}`, scope: "body" };
  if (/\bthis\s*\[/.test(plain)) return { kind: "property", name: "this[]", scope: "body" };
  // The parameter list: the first `(` right after a name (a tuple return
  // type, `(int, string) Get()`, comes before it).
  for (let call = plain.indexOf("("); call >= 0; call = plain.indexOf("(", call + 1)) {
    const name = NAME_AT_END.exec(plain.slice(0, call));
    if (name && !NOT_NAMES.has(name[1])) return { kind: "method", name: name[1], scope: "body" };
  }
  const bare = plain.replace(/\([^()]*\)/g, " ").replace(/\[[^\]]*\]/g, "").split(",")[0];
  const name = NAME_AT_END.exec(bare);
  if (!name || !/\s/.test(bare.trim())) return null;
  const kind: SymbolKind = /\bevent\b/.test(bare) ? "event" : /\bconst\b/.test(bare) ? "constant" : end === "{" || arrow ? "property" : "field";
  return { kind, name: name[1], scope: "body" };
}

export function extractCSharpOutline(text: string): OutlineHeading[] {
  const code = blankCSharp(text);
  const lines = text.split("\n");
  const items: OutlineHeading[] = [];
  // Root's level rises to 1 under a file-scoped `namespace X;`.
  const stack: (Frame & { root?: true })[] = [{ scope: "namespace", level: 0, root: true }];
  let header = "";
  let headerLine = 1;
  let line = 1;
  let depth = 0;

  // The line the name is written on (attributes may come first).
  const lineOf = (name: string) => {
    const word = name.replace(/\W.*$/, "") || name;
    const pattern = new RegExp(`(^|\\W)${word.replace(/[^\w]/g, "\\$&")}(\\W|$)`);
    for (let l = headerLine; l <= line; l++) if (pattern.test(lines[l - 1] ?? "")) return l;
    return headerLine;
  };
  const add = (found: Found, level: number) => {
    if (level <= 3 && items.length < MAX_ITEMS) items.push({ level: level as 1 | 2 | 3, text: clip(found.name), line: lineOf(found.name), kind: found.kind });
  };
  const top = () => stack[stack.length - 1];
  const holder = (): Scope | "root" => (top().root ? "root" : top().scope);
  const enumValue = () => {
    const name = /^@?[A-Za-z_]\w*/.exec(stripAttributes(header));
    if (name) add({ kind: "member", name: name[0], scope: "body" }, top().level + 1);
  };
  const reset = () => { header = ""; depth = 0; };

  for (const c of code) {
    if (c === "\n") { line++; if (header) header += " "; continue; }
    if (c === "{") {
      const found = classify(header, holder(), "{");
      const level = top().level + 1;
      if (found) add(found, level);
      stack.push(found ? { scope: found.scope, level } : { scope: "body", level: top().level });
      reset();
    } else if (c === "}") {
      if (top().scope === "enum" && header.trim()) enumValue();
      if (stack.length > 1) stack.pop();
      reset();
    } else if (c === ";" && depth === 0) {
      const found = classify(header, holder(), ";");
      if (found?.scope === "namespace" && top().root) {
        add(found, 1);
        top().level = 1;
      } else if (found) add(found, top().level + 1);
      reset();
    } else if (c === "," && depth === 0 && top().scope === "enum") {
      enumValue();
      reset();
    } else {
      if (c === "(" || c === "[") depth++;
      else if ((c === ")" || c === "]") && depth > 0) depth--;
      if (!header && /\s/.test(c)) continue;
      if (!header) headerLine = line;
      header += c;
    }
  }
  return items;
}
