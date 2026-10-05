import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { splitTemplate } from "./template-frontmatter";
import { expandTemplate, extractPromptLabels, usesToken } from "./template-tokens";

// What the template picker and the empty-note pills show about a template
// without opening it: an icon, a one-line summary and a read-only preview.

export type TemplateIconKey = "calendar" | "bolt" | "chart" | "checklist" | "rocket" | "sun" | "document";

const ICON_RULES: [RegExp, TemplateIconKey][] = [
  [/standup|daily|journal|day\b/i, "sun"],
  [/meeting|1:1|one.on.one|sync|agenda/i, "calendar"],
  [/bug|incident|issue|hotfix/i, "bolt"],
  [/spec|rfc|design|proposal|adr/i, "rocket"],
  [/report|review|retro|summary|weekly/i, "chart"],
  [/check|todo|list|plan/i, "checklist"],
];

export function templateIcon(name: string): TemplateIconKey {
  return ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? "document";
}

// "3 sections • Action items • Today's date • Asks Owner", from the raw text.
export function templateSummary(raw: string): string {
  const { content } = splitTemplate(raw);
  const parts: string[] = [];
  const sections = content.split("\n").filter((line) => /^##\s+\S/.test(line)).length;
  if (sections > 0) parts.push(`${sections} section${sections === 1 ? "" : "s"}`);
  if (/^\s*- \[ \]/m.test(content)) parts.push("Action items");
  if (usesToken(content, "date")) parts.push("Today's date");
  const questions = extractPromptLabels(content);
  if (questions.length > 0) parts.push(`Asks ${questions.join(", ")}`);
  return parts.join(" • ") || "Plain note";
}

export interface PreviewSegment {
  text: string;
  /** A question still to be answered, shown as a pill. */
  question?: boolean;
}

export interface PreviewLine {
  kind: "h1" | "h2" | "h3" | "task" | "bullet" | "text" | "blank";
  segments: PreviewSegment[];
}

export interface TemplatePreviewModel {
  /** Frontmatter keys the created note gets, with fields filled in. */
  properties: [string, string][];
  lines: PreviewLine[];
}

const QUESTION = /\{\{\s*prompt:([^}\n]*?)\s*\}\}/g;

function segments(text: string): PreviewSegment[] {
  const out: PreviewSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(QUESTION)) {
    if (match.index > last) out.push({ text: text.slice(last, match.index) });
    out.push({ text: match[1].trim() || "?", question: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function line(text: string): PreviewLine {
  const heading = /^(#{1,6})\s+(.*)$/.exec(text);
  if (heading) {
    const level = heading[1].length;
    return { kind: level === 1 ? "h1" : level === 2 ? "h2" : "h3", segments: segments(heading[2]) };
  }
  const task = /^\s*- \[[ xX]\]\s?(.*)$/.exec(text);
  if (task) return { kind: "task", segments: segments(task[1]) };
  const bullet = /^\s*[-*+]\s+(.*)$|^\s*[-*+]$/.exec(text);
  if (bullet) return { kind: "bullet", segments: segments(bullet[1] ?? "") };
  if (!text.trim()) return { kind: "blank", segments: [] };
  return { kind: "text", segments: segments(text) };
}

// The note this template would make right now (dates filled in, the title
// set to `title`), with unanswered questions kept as pills. Blank runs are
// collapsed to one line.
export function templatePreview(raw: string, title: string, now: Date): TemplatePreviewModel {
  const { content } = splitTemplate(raw);
  // Questions stay unanswered: expandTemplate leaves unknown prompt labels as typed.
  const { text } = expandTemplate(content, { now, title, clipboard: "", prompts: {} });
  const fm = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/.exec(text);
  const properties = fm
    ? Object.entries(parseFmFields(text)).map(([key, value]) => [key, value.replace(QUESTION, "$1")] as [string, string])
    : [];
  const body = fm ? text.slice(fm[0].length) : text;
  const lines: PreviewLine[] = [];
  for (const raw of body.replace(/\s+$/, "").split(/\r?\n/)) {
    const next = line(raw);
    if (next.kind === "blank" && (lines.length === 0 || lines[lines.length - 1].kind === "blank")) continue;
    lines.push(next);
  }
  return { properties, lines };
}
