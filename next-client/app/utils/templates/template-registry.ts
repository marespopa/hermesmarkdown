import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";

// Where templates live and which files count as one. Pure: every input is a
// list of indexed vault-relative paths (the keys of atom_fileMetadata).

export const DEFAULT_TEMPLATE_FOLDERS = ["templates", "_templates", "Templates"] as const;

export interface TemplateEntry {
  /** File name without `.md`. */
  name: string;
  /** Vault-relative path. */
  path: string;
}

const folderOf = (path: string) => path.split("/").slice(0, -1).join("/");
const isMarkdown = (path: string) => path.toLowerCase().endsWith(".md");

// The setting wins when set. Otherwise the first default folder that holds at
// least one indexed file directly, checked in order; `templates` when none does.
export function resolveTemplatesFolder(
  setting: string | undefined,
  paths: string[],
): { folder: string; exists: boolean } {
  const folders = new Set(paths.map(folderOf));
  const configured = normalizeFolderPath(setting ?? "");
  if (configured) return { folder: configured, exists: folders.has(configured) };
  const found = DEFAULT_TEMPLATE_FOLDERS.find((folder) => folders.has(folder));
  return found ? { folder: found, exists: true } : { folder: DEFAULT_TEMPLATE_FOLDERS[0], exists: false };
}

// A template is a `.md` file directly inside the templates folder; subfolders don't count.
export function isTemplatePath(path: string, folder: string): boolean {
  return !!folder && isMarkdown(path) && folderOf(path) === folder;
}

export function listTemplates(folder: string, paths: string[]): TemplateEntry[] {
  return paths
    .filter((path) => isTemplatePath(path, folder))
    .map((path) => ({ name: path.split("/").pop()!.replace(/\.md$/i, ""), path }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.name.localeCompare(b.name));
}

const singular = (name: string) => name.toLowerCase().replace(/s$/, "");

// Matches a link's folder segment to a template name, ignoring case and one
// trailing `s` on either side (`rfcs` ↔ `rfc.md` / `rfcs.md`). An exact
// (case-insensitive) name wins, then alphabetical order.
export function matchTemplateForFolder(segment: string, templates: TemplateEntry[]): TemplateEntry | null {
  const key = singular(segment.trim());
  if (!key) return null;
  const candidates = templates.filter((template) => singular(template.name) === key);
  if (candidates.length === 0) return null;
  const exact = candidates.find((template) => template.name.toLowerCase() === segment.trim().toLowerCase());
  if (exact) return exact;
  return [...candidates].sort((a, b) => a.name.localeCompare(b.name))[0];
}

const FORBIDDEN_NAME_CHARS = /[\\/:*?"<>|]/g;

// A file base name from a typed title or an expanded `file_name`: forbidden
// characters become `-`, `.md` is stripped, empty becomes `untitled`.
export function sanitizeNoteName(name: string): string {
  const clean = name.replace(FORBIDDEN_NAME_CHARS, "-").trim().replace(/\.md$/i, "").trim();
  return clean || "untitled";
}

// A template file name (AI chat save card and "New template…"): base name
// only, `..` and leading dots stripped (dot-files aren't indexed), forbidden
// characters become `-`, `.md` added; empty becomes `template.md`.
export function sanitizeTemplateFileName(info: string): string {
  const base = (info.trim().split(/[\\/]/).pop() ?? "")
    .replace(/\.\./g, "")
    .trim()
    .replace(/^\.+/, "")
    .trim()
    .replace(/[:*?"<>|]/g, "-")
    .replace(/\.md$/i, "")
    .trim();
  return `${base || "template"}.md`;
}

const INVALID_BASE_CHARS = /[\\:*?"<>|]/;

// Splits a missing `[[folder/name|alias#heading]]` target into a vault-root
// relative folder (null when the link has none) and the note's base name.
// Null when the base name is empty or can't be a file name.
export function parseMissingLink(link: string): { folder: string | null; baseName: string } | null {
  const target = link.split("|")[0].split("#")[0].trim().replace(/\.md$/i, "");
  const parts = target.split("/");
  const baseName = (parts.pop() ?? "").trim();
  if (!baseName || baseName === "." || baseName === ".." || INVALID_BASE_CHARS.test(baseName)) return null;
  const folder = normalizeFolderPath(parts.join("/"));
  return { folder: folder || null, baseName };
}

// Name suggested when saving a note as a template: its first `# Heading`
// (fields removed), else `fallback` (the note's title).
export function suggestTemplateName(text: string, fallback: string): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
  const heading = /^#\s+(.+)$/m.exec(body)?.[1].replace(/\{\{[^}]*\}\}/g, "").replace(/\s+/g, " ").trim();
  return heading || fallback.trim();
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const JOURNAL_NAMES = /^(journal|daily|diary|day|today|daily note|daily notes)$/i;

// The template a new note's name points to, for preselecting one: its folder
// (`rfcs/auth` → `rfc`, as for missing links), else a template whose name
// starts the note's name, word for word and ignoring one trailing `s`
// (`Meeting notes 2026-10-05` → `Meeting notes`, `rfc-auth` → `rfc`; the
// longest wins), else a journal-like template for a date name (`2026-10-05`).
export function matchTemplateForName(name: string, templates: TemplateEntry[]): TemplateEntry | null {
  const parsed = parseMissingLink(name);
  if (!parsed || templates.length === 0) return null;
  if (parsed.folder) {
    const byFolder = matchTemplateForFolder(parsed.folder.split("/").pop()!, templates);
    if (byFolder) return byFolder;
  }
  const nameWords = words(parsed.baseName);
  const sameWord = (a: string, b: string) => a === b || singular(a) === singular(b);
  const byPrefix = templates
    .map((template) => ({ template, templateWords: words(template.name) }))
    .filter(({ templateWords }) =>
      templateWords.length > 0 &&
      templateWords.length <= nameWords.length &&
      templateWords.every((word, i) => sameWord(word, nameWords[i])))
    .sort((a, b) => b.templateWords.length - a.templateWords.length || a.template.name.localeCompare(b.template.name));
  if (byPrefix[0]) return byPrefix[0].template;
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.baseName)) {
    return templates.find((template) => JOURNAL_NAMES.test(template.name.trim())) ?? null;
  }
  return null;
}
