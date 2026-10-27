import {
  expandTemplate,
  extractPromptLabels,
  isValidToken,
  LEGACY_TEMPLATE_TOKENS,
  parseTemplateToken,
  templateTokenRegex,
  usesToken,
  type TemplateContext,
} from "./template-tokens";
import { templateContent } from "./template-frontmatter";

// Folder templates (scaffolding), pure: expands a folder template that was
// read from disk into the list of folders and files to create. No React, no I/O.
// Names expand prompts and date/time tokens only; `.md` bodies expand every
// token; other files pass through as bytes.

export interface ScaffoldSourceEntry {
  /** Relative to the folder template, "/"-joined. */
  path: string;
  kind: "folder" | "file";
  text?: string;
  bytes?: ArrayBuffer;
}

export interface ScaffoldSource {
  /** The folder template's own name (may contain tokens). */
  name: string;
  /** Folders before their contents, siblings by name. */
  entries: ScaffoldSourceEntry[];
}

export interface ScaffoldPlanEntry {
  /** Relative to the destination, top folder included. */
  path: string;
  kind: "folder" | "file";
  content?: string | ArrayBuffer;
  isRootReadme?: boolean;
  cursor?: number | null;
}

export type ScaffoldPlan =
  | { ok: true; topName: string; entries: ScaffoldPlanEntry[]; noteCount: number }
  | { ok: false; reason: "empty-name" | "duplicate"; sourcePath: string; targetPath?: string };

// Tokens a name may use: the date/time ones and the legacy period names.
const NAME_TOKENS: readonly string[] = [
  "date", "time", "year", "month", "day", "weekday", "weekdayShort",
  "monthName", "monthNameShort", "week", "quarter",
  ...LEGACY_TEMPLATE_TOKENS,
];

const isMarkdown = (path: string) => path.toLowerCase().endsWith(".md");
const lastSegment = (path: string) => path.split("/").pop() ?? "";
const isReadme = (path: string) => lastSegment(path).toLowerCase() === "readme.md";

type NameContext = Pick<TemplateContext, "now" | "prompts">;

function expandNameTokens(segment: string, ctx: NameContext): string {
  const full: TemplateContext = { ...ctx, title: "", clipboard: "" };
  let out = "";
  let last = 0;
  for (const match of segment.matchAll(templateTokenRegex())) {
    const index = match.index ?? 0;
    out += segment.slice(last, index);
    last = index + match[0].length;
    const inner = match[1];
    const allowed = inner.startsWith("prompt:") ||
      (isValidToken(inner) && NAME_TOKENS.includes(parseTemplateToken(inner)?.name ?? ""));
    out += allowed ? expandTemplate(match[0], full).text : match[0];
  }
  return out + segment.slice(last);
}

// A name's tokens filled in, then made safe as a file name: forbidden
// characters become `-`, trimmed, leading dots removed.
export function expandNameSegment(segment: string, ctx: NameContext): string {
  return expandNameTokens(segment, ctx)
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim()
    .replace(/^\.+/, "");
}

// The folder template's name as listed: prompts show their label, the other
// tokens are filled in for now.
export function folderTemplateDisplayName(name: string, now: Date): string {
  const ctx: TemplateContext = { now, title: "", clipboard: "", prompts: {} };
  let out = "";
  let last = 0;
  for (const match of name.matchAll(templateTokenRegex())) {
    const index = match.index ?? 0;
    out += name.slice(last, index);
    last = index + match[0].length;
    out += match[1].startsWith("prompt:") ? match[1].slice("prompt:".length).trim() : expandTemplate(match[0], ctx).text;
  }
  return out + name.slice(last);
}

const bodyOf = (entry: ScaffoldSourceEntry) =>
  entry.kind === "file" && isMarkdown(entry.path) ? templateContent(entry.text ?? "", { dropKeys: ["scaffold"] }) : null;

// Prompt labels, each once: the folder template's name, then every entry's
// name (folders before contents), then every `.md` body.
export function scaffoldPromptLabels(source: ScaffoldSource): string[] {
  const labels: string[] = [];
  const add = (text: string) => {
    for (const label of extractPromptLabels(text)) if (!labels.includes(label)) labels.push(label);
  };
  add(source.name);
  for (const entry of source.entries) add(lastSegment(entry.path));
  for (const entry of source.entries) {
    const body = bodyOf(entry);
    if (body !== null) add(body);
  }
  return labels;
}

export function scaffoldUsesClipboard(source: ScaffoldSource): boolean {
  return source.entries.some((entry) => {
    const body = bodyOf(entry);
    return body !== null && usesToken(body, "clipboard");
  });
}

export function planScaffold(source: ScaffoldSource, ctx: Omit<TemplateContext, "title" | "selection">): ScaffoldPlan {
  const nameCtx = { now: ctx.now, prompts: ctx.prompts };
  const topName = expandNameSegment(source.name, nameCtx);
  if (!topName) return { ok: false, reason: "empty-name", sourcePath: source.name };

  const expanded: { entry: ScaffoldSourceEntry; target: string; segments: string[] }[] = [];
  for (const entry of source.entries) {
    const segments: string[] = [];
    for (const segment of entry.path.split("/")) {
      const name = expandNameSegment(segment, nameCtx);
      if (!name) return { ok: false, reason: "empty-name", sourcePath: entry.path };
      segments.push(name);
    }
    expanded.push({ entry, segments, target: `${topName}/${segments.join("/")}` });
  }

  const entries: ScaffoldPlanEntry[] = [{ path: topName, kind: "folder" }];
  let noteCount = 0;
  for (const { entry, segments, target } of expanded) {
    if (entry.kind === "folder") {
      entries.push({ path: target, kind: "folder" });
      continue;
    }
    if (!isMarkdown(entry.path)) {
      entries.push({ path: target, kind: "file", content: entry.bytes ?? new ArrayBuffer(0) });
      continue;
    }
    const isRoot = !entry.path.includes("/") && isReadme(entry.path);
    const base = segments[segments.length - 1];
    const title = isReadme(entry.path)
      ? (segments.length > 1 ? segments[segments.length - 2] : topName)
      : base.replace(/\.md$/i, "");
    const { text, cursor } = expandTemplate(bodyOf(entry) ?? "", { ...ctx, title, selection: "" });
    if (isRoot && !text.trim()) continue;
    noteCount++;
    entries.push({
      path: target,
      kind: "file",
      content: text || "\n",
      ...(isRoot ? { isRootReadme: true, cursor } : {}),
    });
  }

  const seen = new Map<string, string>();
  for (const { path } of entries) {
    const key = path.toLowerCase();
    if (seen.has(key)) {
      const sourcePath = expanded.find((e) => e.target === path)?.entry.path ?? path;
      return { ok: false, reason: "duplicate", sourcePath, targetPath: path };
    }
    seen.set(key, path);
  }
  return { ok: true, topName, entries, noteCount };
}
