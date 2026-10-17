// The pure per-file parse of the metadata worker: frontmatter, tags, links,
// metrics, tasks and preview from a note's text. Board JSON (a hermes-board
// fence) is blanked first so it never counts as words, tags, links or preview.
import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { extractTasks } from "@/app/utils/taskExtractor";
import { notePreview } from "@/app/utils/markdown-preview";
import { stripBoardFence } from "@/app/utils/board/board-format";
import { REGEX_FRONTMATTER } from "./content-index";

const REGEX_TAG = /(?<=^|\s)#(?=[a-zA-Z0-9_\-/]*[a-zA-Z])([a-zA-Z0-9_\-/]+)/g;
const REGEX_LINK = /\[\[(.*?)\]\]/g;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^["']|["']$/g, "").replace(/^#/, "").toLowerCase();
}

function parseFrontmatterTags(fmContent: string): string[] {
  const inlineMatch = fmContent.match(/^tags:\s*\[(.*?)\]/m);
  if (inlineMatch) {
    return inlineMatch[1]
      .split(",")
      .map(normalizeTag)
      .filter(Boolean);
  }
  const lines = fmContent.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^tags:\s*$/.test(l));
  if (idx !== -1) {
    const result: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*-\s+(.+)/);
      if (m) result.push(normalizeTag(m[1]));
      else break;
    }
    return result;
  }
  return [];
}

export interface NoteFileInfo {
  path: string;
  name: string;
  content: string;
  modifiedAt: number;
}

export function parseNoteFile({ path, name, content, modifiedAt }: NoteFileInfo) {
  // Board JSON is blanked line for line, so line numbers stay valid.
  const text = stripBoardFence(content);

  // Frontmatter Extraction — reuses parseFmFields so Obsidian-style block
  // lists (e.g. `related:\n  - "[[Note]]"`) are captured for every field,
  // not just `tags` which has its own dedicated parser below.
  const fmMatch = content.match(REGEX_FRONTMATTER);
  const frontmatter: Record<string, any> = fmMatch ? parseFmFields(content) : {};

  // Tag Extraction: frontmatter tags + inline #hashtags from body only
  const fmTags = fmMatch ? parseFrontmatterTags(fmMatch[1]) : [];
  const bodyContent = fmMatch ? text.slice(fmMatch[0].length) : text;
  const tagMatches = Array.from(bodyContent.matchAll(REGEX_TAG));
  const inlineTags = tagMatches.map((m: any) => m[1].toLowerCase());
  const tags = Array.from(new Set([...fmTags, ...inlineTags]));

  // Title fallback: frontmatter title -> first H1 in body -> filename
  if (!frontmatter.title) {
    const h1Match = bodyContent.match(/^#\s+(.+)$/m);
    if (h1Match) frontmatter.title = h1Match[1].trim();
  }

  // Wiki Link Extraction
  const linkMatches = Array.from(text.matchAll(REGEX_LINK));
  const links = Array.from(new Set(linkMatches.map((m: any) => m[1].trim())));

  // Metrics
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Task Extraction: checklist items outside fenced code, their status from
  // the box character (see app/utils/taskExtractor.ts). Fenced code,
  // including a board's JSON, yields none.
  const tasks = extractTasks(path, content);

  // Plain-text excerpt for note lists
  const preview = notePreview(text);

  return { path, name, tags, links, frontmatter, modifiedAt, wordCount, tasks, preview };
}
