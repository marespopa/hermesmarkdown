import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";

// Where templates live and which files count as one. Pure: every input is a
// list of indexed vault-relative paths (the keys of atom_fileMetadata).
// Templates live in `templates/` at the vault root (created on first use). A
// template is a `.md` file directly in it, or one folder down: a template
// pack (`templates/Journal/Daily.md`).

export const TEMPLATES_FOLDER = "templates";

export interface TemplateEntry {
  /** File name without `.md`. */
  name: string;
  /** Vault-relative path. */
  path: string;
  /** The pack (subfolder of the templates folder) it belongs to; none for a loose template. */
  pack?: string;
}

export interface TemplatePack {
  /** The subfolder's name; "" for the loose templates directly in the folder. */
  name: string;
  /** Vault-relative folder. */
  folder: string;
  templates: TemplateEntry[];
}

const folderOf = (path: string) => path.split("/").slice(0, -1).join("/");
const isMarkdown = (path: string) => path.toLowerCase().endsWith(".md");

// Always `templates/` at the vault root; `exists` when it holds at least one
// indexed file, directly or in a pack.
export function resolveTemplatesFolder(paths: string[]): { folder: string; exists: boolean } {
  const exists = paths.some((path) => folderOf(path) === TEMPLATES_FOLDER || folderOf(folderOf(path)) === TEMPLATES_FOLDER);
  return { folder: TEMPLATES_FOLDER, exists };
}

// The pack a path's template belongs to: "" directly in the folder, the
// subfolder's name one level down, null when it isn't a template at all.
function packOf(path: string, folder: string): string | null {
  if (!folder || !isMarkdown(path) || !path.startsWith(`${folder}/`)) return null;
  const rest = path.slice(folder.length + 1).split("/");
  if (rest.length === 1) return "";
  return rest.length === 2 && rest[0] && !rest[0].startsWith(".") ? rest[0] : null;
}

// A `.md` file directly inside the templates folder or one of its packs
// (direct subfolders); anything deeper doesn't count.
export function isTemplatePath(path: string, folder: string): boolean {
  return packOf(path, folder) !== null;
}

const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()) || a.localeCompare(b);

// Loose templates first, then each pack in name order; by name within each.
export function listTemplates(folder: string, paths: string[]): TemplateEntry[] {
  return paths
    .flatMap((path): TemplateEntry[] => {
      const pack = packOf(path, folder);
      if (pack === null) return [];
      const name = path.split("/").pop()!.replace(/\.md$/i, "");
      return [pack ? { name, path, pack } : { name, path }];
    })
    .sort((a, b) => byName(a.pack ?? "", b.pack ?? "") || byName(a.name, b.name));
}

// Templates grouped by pack: the loose ones first (name ""), then every pack
// folder, including empty ones from `folderPaths` (the vault's folders).
export function groupTemplatePacks(folder: string, templates: TemplateEntry[], folderPaths: string[] = []): TemplatePack[] {
  const packs = new Map<string, TemplatePack>();
  const packFor = (name: string) => {
    if (!packs.has(name)) packs.set(name, { name, folder: name ? `${folder}/${name}` : folder, templates: [] });
    return packs.get(name)!;
  };
  for (const path of folderPaths) {
    if (folderOf(path) === folder && !path.split("/").pop()!.startsWith(".")) packFor(path.split("/").pop()!);
  }
  for (const template of templates) packFor(template.pack ?? "").templates.push(template);
  return [...packs.values()]
    .filter((pack) => pack.name || pack.templates.length > 0)
    .sort((a, b) => (a.name === "" ? -1 : b.name === "" ? 1 : byName(a.name, b.name)));
}


const singular = (name: string) => name.toLowerCase().replace(/s$/, "");

// Matches a link's folder segment to a template name, ignoring case and one
// trailing `s` on either side (`rfcs` ↔ `rfc.md` / `rfcs.md`). An exact
// (case-insensitive) name wins, then alphabetical order.
function matchTemplateForFolder(segment: string, templates: TemplateEntry[]): TemplateEntry | null {
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

// The template a new note's name points to, for preselecting one in the
// template pickers (missing links, the WikiLink dialog): its folder
// (`rfcs/auth` → `rfc`), else a template whose name
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
