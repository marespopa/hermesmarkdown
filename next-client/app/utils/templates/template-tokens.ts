// Token grammar for vault templates: `{{name}}` (whitespace inside the braces
// allowed), `{{prompt:Label}}`, and for dates `{{date:YYYY-MM-DD}}` (a
// format), `{{date+1d}}` (math: d, w, m = months, y) or both
// (`{{date-1w:dddd}}`); `{{time:HH:mm}}` takes a format too. Expansion is one
// left-to-right pass, so text a token inserts (clipboard, selection, prompt
// answers) is never expanded again. Any other `{{name}}` stays as it is: a
// blank to fill in in the created note (Tab jumps between them).

export const TEMPLATE_TOKENS = [
  "date",
  "time",
  "weekday",
  "year",
  "month",
  "day",
  "monthName",
  "title",
  "slug",
  "clipboard",
  "selection",
  "cursor",
] as const;

export type TemplateToken = (typeof TEMPLATE_TOKENS)[number];

export interface TemplateContext {
  now: Date;
  title: string;
  clipboard: string;
  prompts: Record<string, string>;
  /** Text selected when the template was inserted (`{{selection}}`). */
  selection?: string;
}

export interface ExpandedTemplate {
  text: string;
  /** Offset of the first `{{cursor}}` in `text`, or null when there is none. */
  cursor: number | null;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A fresh regex per call: a shared /g regex keeps lastIndex between uses.
const tokenRegex = () => /\{\{\s*(prompt:[^}]*|[A-Za-z_]\w*(?:[+-]\d+[dwmyDWMY])?(?::[^}\n]*)?)\s*\}\}/g;
export const templateTokenRegex = tokenRegex;
const PROMPT_PREFIX = "prompt:";

export interface ParsedToken {
  name: string;
  /** Date math: `+1d` → { amount: 1, unit: "d" }. */
  offset?: { amount: number; unit: "d" | "w" | "m" | "y" };
  /** Text after `:`, trimmed. */
  format?: string;
}

// What's inside `{{…}}` (prompts excluded), or null when it isn't a token.
export function parseTemplateToken(inner: string): ParsedToken | null {
  const match = /^\s*([A-Za-z_]\w*)(?:([+-]\d+)([dwmyDWMY]))?(?::([^}\n]*))?\s*$/.exec(inner);
  if (!match) return null;
  const parsed: ParsedToken = { name: match[1] };
  if (match[2]) parsed.offset = { amount: Number(match[2]), unit: match[3].toLowerCase() as "d" | "w" | "m" | "y" };
  if (match[4] !== undefined && match[4].trim()) parsed.format = match[4].trim();
  return parsed;
}

const isKnownToken = (name: string) => (TEMPLATE_TOKENS as readonly string[]).includes(name);

// Whether `{{inner}}` is a known token used correctly: formats on date/time
// only, math on date only.
export function isValidToken(inner: string): boolean {
  if (inner.trim().startsWith(PROMPT_PREFIX)) return true;
  const parsed = parseTemplateToken(inner);
  if (!parsed || !isKnownToken(parsed.name)) return false;
  if (parsed.offset && parsed.name !== "date") return false;
  if (parsed.format && parsed.name !== "date" && parsed.name !== "time") return false;
  return true;
}

// A blank: `{{name}}` that is no token (no math, no format). Stays in the
// created note to be filled in.
export function isBlankToken(inner: string): boolean {
  const parsed = parseTemplateToken(inner);
  return !!parsed && !parsed.offset && !parsed.format && !isKnownToken(parsed.name);
}

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Moment-style subset: YYYY YY MMMM MMM MM M dddd ddd DD D HH H mm ss, and
// [literal text].
export function formatDate(date: Date, format: string): string {
  return format.replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|mm|ss/g, (token, literal) => {
    if (literal !== undefined) return literal;
    switch (token) {
      case "YYYY": return String(date.getFullYear());
      case "YY": return String(date.getFullYear()).slice(-2);
      case "MMMM": return MONTHS[date.getMonth()];
      case "MMM": return MONTHS[date.getMonth()].slice(0, 3);
      case "MM": return pad(date.getMonth() + 1);
      case "M": return String(date.getMonth() + 1);
      case "dddd": return WEEKDAYS[date.getDay()];
      case "ddd": return SHORT_WEEKDAYS[date.getDay()];
      case "DD": return pad(date.getDate());
      case "D": return String(date.getDate());
      case "HH": return pad(date.getHours());
      case "H": return String(date.getHours());
      case "mm": return pad(date.getMinutes());
      default: return pad(date.getSeconds());
    }
  });
}

// `now` moved by the offset; months and years keep the day where the
// target month has it (Jan 31 + 1m → Feb 28).
export function shiftDate(now: Date, offset: NonNullable<ParsedToken["offset"]>): Date {
  const date = new Date(now.getTime());
  if (offset.unit === "d" || offset.unit === "w") {
    date.setDate(date.getDate() + offset.amount * (offset.unit === "w" ? 7 : 1));
    return date;
  }
  const months = offset.amount * (offset.unit === "y" ? 12 : 1);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

const pad = (n: number) => String(n).padStart(2, "0");

// URL-safe kebab-case: accents removed, every run of other characters
// becomes `-`, no leading/trailing `-`.
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function temporalValue(token: string, now: Date): string | null {
  switch (token) {
    case "date": return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    case "time": return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    case "weekday": return WEEKDAYS[now.getDay()];
    case "year": return String(now.getFullYear());
    case "month": return pad(now.getMonth() + 1);
    case "day": return pad(now.getDate());
    case "monthName": return MONTHS[now.getMonth()];
    default: return null;
  }
}

export function usesToken(body: string, token: TemplateToken): boolean {
  for (const match of body.matchAll(tokenRegex())) {
    if (parseTemplateToken(match[1])?.name === token) return true;
  }
  return false;
}

// Distinct, trimmed `{{prompt:Label}}` labels in first-appearance order.
// Labels are case-sensitive; an empty label isn't a field.
export function extractPromptLabels(body: string): string[] {
  const labels: string[] = [];
  for (const match of body.matchAll(tokenRegex())) {
    if (!match[1].startsWith(PROMPT_PREFIX)) continue;
    const label = match[1].slice(PROMPT_PREFIX.length).trim();
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

export function expandTemplate(body: string, ctx: TemplateContext): ExpandedTemplate {
  let text = "";
  let cursor: number | null = null;
  let last = 0;
  for (const match of body.matchAll(tokenRegex())) {
    const index = match.index ?? 0;
    text += body.slice(last, index);
    last = index + match[0].length;
    const value = tokenValue(match[1], ctx);
    if (value === CURSOR) {
      if (cursor === null) cursor = text.length;
    } else {
      text += value ?? match[0];
    }
  }
  text += body.slice(last);
  return { text, cursor };
}

const CURSOR = Symbol("cursor");

function tokenValue(token: string, ctx: TemplateContext): string | typeof CURSOR | null {
  if (token.startsWith(PROMPT_PREFIX)) {
    const label = token.slice(PROMPT_PREFIX.length).trim();
    return label && label in ctx.prompts ? ctx.prompts[label] : null;
  }
  if (!isValidToken(token)) return null;
  const { name, offset, format } = parseTemplateToken(token)!;
  if (name === "date" && (offset || format)) {
    return formatDate(offset ? shiftDate(ctx.now, offset) : ctx.now, format ?? "YYYY-MM-DD");
  }
  if (name === "time" && format) return formatDate(ctx.now, format);
  switch (name) {
    case "title": return ctx.title;
    case "slug": return slugify(ctx.title);
    case "clipboard": return ctx.clipboard;
    case "selection": return ctx.selection ?? "";
    case "cursor": return CURSOR;
    default: return temporalValue(name, ctx.now);
  }
}

// 1-based line, 0-based column of `offset` in `text`.
export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset);
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length };
}
