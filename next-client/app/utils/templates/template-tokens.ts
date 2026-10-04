// Token grammar for vault templates: `{{name}}` (whitespace inside the braces
// allowed) and `{{prompt:Label}}`. Expansion is one left-to-right pass, so text
// a token inserts (clipboard, prompt answers) is never expanded again. Unknown
// tokens stay as they are.

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
  "cursor",
] as const;

export type TemplateToken = (typeof TEMPLATE_TOKENS)[number];

export interface TemplateContext {
  now: Date;
  title: string;
  clipboard: string;
  prompts: Record<string, string>;
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
const tokenRegex = () => /\{\{\s*(prompt:[^}]*|[A-Za-z]+)\s*\}\}/g;
const PROMPT_PREFIX = "prompt:";

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
    if (match[1] === token) return true;
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
  switch (token) {
    case "title": return ctx.title;
    case "slug": return slugify(ctx.title);
    case "clipboard": return ctx.clipboard;
    case "cursor": return CURSOR;
    default: return temporalValue(token, ctx.now);
  }
}

// 1-based line, 0-based column of `offset` in `text`.
export function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  const before = text.slice(0, offset);
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length };
}
