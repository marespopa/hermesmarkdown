import type { FileMetadata } from "@/app/atoms/metadata";
import { boardTextForReading } from "@/app/utils/board/board-format";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { isMarkdownPath } from "@/app/utils/file-kinds";
import { toolActivity } from "../../ai-chat/chat-tool-runners";

// The pure half of the companion's vault and editor read tools (list_folder,
// read_file, get_active_note): what each one answers, from the vault's lists
// and the text the client read. use-companion-tools.ts runs them. Private
// notes are listed as "private (hidden)" and never read.

// A tool result holds at most this much of one file.
export const FILE_CHAR_LIMIT = 40_000;
export const FOLDER_PAGE_SIZE = 100;

export const PRIVATE_HIDDEN = "private (hidden)";

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const parentOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

export function capText(text: string, limit = FILE_CHAR_LIMIT): string {
  return text.length > limit ? `${text.slice(0, limit)}\n[file continues…]` : text;
}

export interface VaultListing {
  notes: Record<string, FileMetadata>;
  textFiles: string[];
  folders: string[];
}

// One folder's direct children: folders first, then files, by name, a page
// at a time. Private notes keep their name but are marked hidden.
export function listFolderOutput(path: string, page: number, { notes, textFiles, folders }: VaultListing): string {
  const where = path || "the vault's top level";
  const childFolders = [...new Set(folders.filter((folder) => folder && parentOf(folder) === path))]
    .sort((a, b) => a.localeCompare(b));
  const childFiles = [...new Set([...Object.keys(notes), ...textFiles].filter((file) => parentOf(file) === path))]
    .sort((a, b) => baseName(a).localeCompare(baseName(b)));
  if (path && !childFolders.length && !childFiles.length && !folders.includes(path)) {
    return `No folder named "${path}". Use list_folder("") to see the top level.`;
  }
  const lines = [
    ...childFolders.map((folder) => `- ${folder}/ (folder)`),
    ...childFiles.map((file) => {
      const note = notes[file];
      if (note && isPrivateFrontmatter(note.frontmatter)) return `- ${file} (${PRIVATE_HIDDEN})`;
      return `- ${file}${note ? " (note)" : ""}`;
    }),
  ];
  if (!lines.length) return `${where} is empty.`;
  const pages = Math.ceil(lines.length / FOLDER_PAGE_SIZE);
  const current = Math.min(Math.max(1, page), pages);
  const shown = lines.slice((current - 1) * FOLDER_PAGE_SIZE, current * FOLDER_PAGE_SIZE);
  const more = current < pages ? `\n[page ${current} of ${pages}; ask for page ${current + 1} for more]` : "";
  return `${where} holds ${childFolders.length} folder${childFolders.length === 1 ? "" : "s"} and ${childFiles.length} file${childFiles.length === 1 ? "" : "s"}:\n${shown.join("\n")}${more}`;
}

// The lines of `text` from `startLine`, at most `lineCount` of them and
// FILE_CHAR_LIMIT characters; a cut says which lines it showed and the
// startLine that carries on. Lines carry no numbers: the model would paste
// them into edit_file's `find`.
export function readLines(text: string, startLine = 1, lineCount = Infinity): string {
  const lines = text.split("\n");
  const first = Math.min(Math.max(1, Math.floor(startLine) || 1), lines.length);
  if (first === 1 && lines.length <= lineCount && text.length <= FILE_CHAR_LIMIT) return text;
  const shown: string[] = [];
  let cut = false;
  let size = 0;
  for (let i = first - 1; i < lines.length && shown.length < lineCount; i++) {
    if (shown.length && size + lines[i].length + 1 > FILE_CHAR_LIMIT) break;
    if (lines[i].length > FILE_CHAR_LIMIT) cut = true;
    shown.push(lines[i].slice(0, FILE_CHAR_LIMIT));
    size += lines[i].length + 1;
  }
  const last = first + shown.length - 1;
  const more = last < lines.length ? `; call read_file with startLine ${last + 1} for the rest` : "";
  const long = cut ? "; a line longer than the limit was cut" : "";
  return `${shown.join("\n")}\n[lines ${first}–${last} of ${lines.length}${more}${long}]`;
}

// A file's text for read_file, a range of it when asked or when it is long,
// or why it can't be read.
export function readFileOutput(path: string, note: FileMetadata | undefined, text: string | null, startLine?: number, lineCount?: number): string {
  if (note && isPrivateFrontmatter(note.frontmatter)) return `${path} is ${PRIVATE_HIDDEN}. Ask the user to open it.`;
  if (text === null) return `${path} couldn't be read. Check the path with list_folder.`;
  if (isMarkdownPath(path) && isPrivateContent(text)) return `${path} is ${PRIVATE_HIDDEN}. Ask the user to open it.`;
  const readable = isMarkdownPath(path) ? boardTextForReading(text) : text;
  return `--- FILE: ${path} ---\n${readLines(readable, startLine, lineCount)}\n--- END FILE ---`;
}

export interface CodeBlock {
  /** 0-based, among the note's fenced code blocks. */
  index: number;
  lang: string;
  code: string;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;

// The fenced code blocks of a note, in order, with the offsets of their
// opening and closing fence lines.
export function codeBlocks(doc: string): (CodeBlock & { from: number; to: number })[] {
  const blocks: (CodeBlock & { from: number; to: number })[] = [];
  let open: { fence: string; lang: string; from: number; lines: string[] } | null = null;
  let offset = 0;
  for (const line of doc.split("\n")) {
    const end = offset + line.length;
    const match = FENCE.exec(line);
    if (!open && match) {
      open = { fence: match[1], lang: match[2], from: offset, lines: [] };
    } else if (open && match && match[1][0] === open.fence[0] && match[1].length >= open.fence.length && !match[2]) {
      blocks.push({ index: blocks.length, lang: open.lang, code: open.lines.join("\n"), from: open.from, to: end });
      open = null;
    } else if (open) {
      open.lines.push(line);
    }
    offset = end + 1;
  }
  return blocks;
}

// The code block the cursor at `pos` is in, if any.
export function codeBlockAt(doc: string, pos: number): CodeBlock | null {
  const block = codeBlocks(doc).find(({ from, to }) => pos >= from && pos <= to);
  return block ? { index: block.index, lang: block.lang, code: block.code } : null;
}

export interface ActiveNote {
  path: string | null;
  selection: string;
  codeBlock: CodeBlock | null;
  isPrivate: boolean;
}

// get_active_note's answer.
export function activeNoteOutput({ path, selection, codeBlock, isPrivate }: ActiveNote): string {
  if (!path) return "No file is open in the editor.";
  if (isPrivate) return `The open file (${path}) is ${PRIVATE_HIDDEN}.`;
  const parts = [`Open note: ${path}`];
  parts.push(selection.trim()
    ? `--- SELECTED TEXT ---\n${capText(selection)}\n--- END SELECTED TEXT ---`
    : "Nothing is selected.");
  if (codeBlock) {
    parts.push(`The cursor is in code block ${codeBlock.index}${codeBlock.lang ? ` (${codeBlock.lang})` : ""}:\n${capText(codeBlock.code)}`);
  }
  return parts.join("\n");
}

// "Roadmap.md" for one path, "3 items" for more.
const itemsLabel = (paths: unknown) => {
  const list = Array.isArray(paths) ? paths.map(String) : [];
  return list.length === 1 ? list[0] : `${list.length} items`;
};

// The quiet line a tool chip shows for a call.
export function companionToolActivity(name: string, input: Record<string, unknown>, detail = ""): string {
  const suffix = detail ? ` · ${detail}` : "";
  if (name === "list_folder") return `Listed ${String(input.path ?? "") || "the vault"}${suffix}`;
  if (name === "read_file") return `Read ${String(input.path ?? "a file")}${suffix}`;
  if (name === "search_files") return `Searched files for “${String(input.query ?? "")}”${suffix}`;
  if (name === "find_files") return `Found files named ${String(input.pattern ?? "")}${suffix}`;
  if (name === "get_active_note") return `Looked at the open file${suffix}`;
  if (name === "edit_file") return `Edited ${String(input.path ?? "a file")}${suffix}`;
  if (name === "create_file") return `Created ${String(input.path ?? "a file")}${suffix}`;
  if (name === "create_folder") return `Created the folder ${String(input.path ?? "")}${suffix}`;
  if (name === "rename") return `Renamed ${String(input.path ?? "an item")} to ${String(input.newName ?? "…")}${suffix}`;
  if (name === "move") return `Moved ${itemsLabel(input.paths)} to ${String(input.folder ?? "") || "the vault"}${suffix}`;
  if (name === "trash") return `Moved ${itemsLabel(input.paths)} to Trash${suffix}`;
  if (name === "web_search") return `Searched the web for “${String(input.query ?? "")}”${suffix}`;
  if (name === "create_template") return `Saved the template ${String(input.name ?? "")}${suffix}`;
  return toolActivity(name, input, detail);
}
