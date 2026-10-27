import {
  expandTemplate,
  extractPromptLabels,
  isValidToken,
  LEGACY_TEMPLATE_TOKENS,
  parseTemplateToken,
  usesToken,
  type TemplateContext,
} from "./template-tokens";
import { templateContent } from "./template-frontmatter";
import { FM_REGEX } from "@/app/utils/frontmatter-utils";

// Folder templates (scaffolding), pure: expands a folder template that was
// read from disk into the list of folders and files to create. No React, no I/O.
// Names expand prompts and date/time tokens only (see nameTokenRegex); `.md` bodies expand every
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

// `{{…}}` in a file or folder name. Windows and macOS refuse `:` in names, so
// a prompt there is written `{{Project name}}`: any text that isn't a name
// token asks for it, like `{{prompt:Project name}}` (which still works where
// the disk allows it). A format (`{{date:YYYY}}`) can't be used in a name.
const nameTokenRegex = () => /\{\{\s*([^{}]+?)\s*\}\}/g;

type NamePart = { kind: "prompt"; label: string } | { kind: "token" } | { kind: "literal" };

function nameTokenKind(inner: string): NamePart {
  if (inner.startsWith("prompt:")) {
    const label = inner.slice("prompt:".length).trim();
    return label ? { kind: "prompt", label } : { kind: "literal" };
  }
  if (isValidToken(inner)) {
    return NAME_TOKENS.includes(parseTemplateToken(inner)?.name ?? "") ? { kind: "token" } : { kind: "literal" };
  }
  return { kind: "prompt", label: inner };
}

// Each `{{…}}` in `segment` replaced by `replace(match, part)`.
function mapNameTokens(segment: string, replace: (token: string, part: NamePart) => string): string {
  return segment.replace(nameTokenRegex(), (token, inner: string) => replace(token, nameTokenKind(inner.trim())));
}

// The prompt labels a name asks for, in order, each once.
export function namePromptLabels(segment: string): string[] {
  const labels: string[] = [];
  mapNameTokens(segment, (token, part) => {
    if (part.kind === "prompt" && !labels.includes(part.label)) labels.push(part.label);
    return token;
  });
  return labels;
}

function expandNameTokens(segment: string, ctx: NameContext): string {
  const full: TemplateContext = { ...ctx, title: "", clipboard: "" };
  return mapNameTokens(segment, (token, part) => {
    if (part.kind === "prompt") return ctx.prompts?.[part.label] ?? "";
    if (part.kind === "token") return expandTemplate(token, full).text;
    return token;
  });
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
  return mapNameTokens(name, (token, part) => {
    if (part.kind === "prompt") return part.label;
    if (part.kind === "token") return expandTemplate(token, ctx).text;
    return token;
  });
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
  const addName = (name: string) => {
    for (const label of namePromptLabels(name)) if (!labels.includes(label)) labels.push(label);
  };
  addName(source.name);
  for (const entry of source.entries) addName(lastSegment(entry.path));
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

// `text` with `scaffold: true` in its frontmatter (a block is added when
// there is none; a `scaffold:` line already there is replaced).
function withScaffoldFlag(text: string): string {
  const match = FM_REGEX.exec(text);
  if (!match) return `---\nscaffold: true\n---\n\n${text.replace(/^\s+/, "")}`;
  const lines = match[1].split(/\r?\n/).filter((line) => !/^scaffold:/.test(line));
  return `---\n${[...lines, "scaffold: true"].join("\n")}\n---\n${text.slice(match[0].length)}`;
}

// A new folder template's files, ready for writeScaffold: `entries` inside a
// `folderName` folder, the root README.md marked `scaffold: true` (one is
// made when there is none: frontmatter only, so the folders it creates don't
// get it).
export function newFolderTemplatePlan(folderName: string, entries: ScaffoldSourceEntry[]): Extract<ScaffoldPlan, { ok: true }> {
  const hasReadme = entries.some((e) => e.kind === "file" && isReadme(e.path) && !e.path.includes("/"));
  const all: ScaffoldSourceEntry[] = hasReadme ? entries : [...entries, { path: "README.md", kind: "file", text: "" }];
  const planned: ScaffoldPlanEntry[] = [{ path: folderName, kind: "folder" }];
  let noteCount = 0;
  for (const entry of all) {
    const path = `${folderName}/${entry.path}`;
    if (entry.kind === "folder") {
      planned.push({ path, kind: "folder" });
      continue;
    }
    const isRoot = !entry.path.includes("/") && isReadme(entry.path);
    if (isMarkdown(entry.path)) noteCount++;
    const content = isRoot
      ? (entry.text?.trim() ? withScaffoldFlag(entry.text) : "---\nscaffold: true\n---\n")
      : entry.text ?? entry.bytes ?? new ArrayBuffer(0);
    planned.push({ path, kind: "file", content, ...(isRoot ? { isRootReadme: true } : {}) });
  }
  return { ok: true, topName: folderName, entries: planned, noteCount };
}
