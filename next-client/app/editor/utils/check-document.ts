import type { FileMetadata } from "@/app/atoms/metadata";
import { fileLinkPath, resolveFileLink } from "@/app/utils/note-links/file-link";
import { createLinkResolver } from "@/app/utils/note-links/link-resolver";
import { lineColumnAt, maskInlineCode, scanWikiLinks } from "@/app/utils/note-links/wikilink-scan";

// Check document: what is wrong with a note's links, images and headings,
// each with the one edit that fixes it. Pure apart from `fileExists`, which
// the caller supplies (the vault), so the same checker serves the palette
// command and the tests.

export type DocIssueKind = "broken-link" | "missing-image" | "skipped-heading";

export interface DocFix {
  label: string;
  from: number;
  to: number;
  insert: string;
}

export interface DocIssue {
  id: string;
  kind: DocIssueKind;
  /** 1-based line of the problem. */
  line: number;
  message: string;
  fix: DocFix;
}

export interface CheckContext {
  /** The note's vault path; null for a draft. */
  notePath: string | null;
  fileMetadata: Record<string, FileMetadata>;
  /** Whether a vault path (any file kind) exists. */
  fileExists: (vaultPath: string) => Promise<boolean>;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+|$)/;
const MD_LINK = /(!?)\[([^\]\n]*)\]\((<[^>\n]+>|[^)\s]+)(?:\s+"[^"\n]*")?\)/g;
const HAS_SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
// Embeds of these resolve anywhere in a vault, so a bare name can't be judged.
const MEDIA_TARGET = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|pdf|mp3|mp4|mov|wav|m4a|webm|csv|json|txt)$/i;

interface ScannedLink {
  from: number;
  to: number;
  image: boolean;
  label: string;
  href: string;
}
interface ScannedHeading {
  level: number;
  from: number;
  hashes: number;
}

// One pass over the lines outside frontmatter and fenced code.
function scanBody(text: string): { links: ScannedLink[]; headings: ScannedHeading[] } {
  const links: ScannedLink[] = [];
  const headings: ScannedHeading[] = [];
  const lines = text.split("\n");
  let offset = 0;
  let fence: string | null = null;
  let frontmatterEnd = -1;
  if (lines[0]?.trim() === "---") frontmatterEnd = lines.findIndex((line, i) => i > 0 && line.trim() === "---");

  lines.forEach((line, index) => {
    const start = offset;
    offset += line.length + 1;
    if (index <= frontmatterEnd) return;
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      return;
    }
    if (fence) return;
    const heading = HEADING.exec(line);
    if (heading) headings.push({ level: heading[1].length, from: start, hashes: heading[1].length });
    const masked = maskInlineCode(line);
    MD_LINK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MD_LINK.exec(masked))) {
      // Offsets within the line: `!`, `[`, label, `](`, then the href.
      const labelStart = match.index + match[1].length + 1;
      const raw = line.slice(labelStart + match[2].length + 2, match.index + match[0].length);
      const href = /^<([^>]+)>/.exec(raw)?.[1] ?? /^[^)\s]+/.exec(raw)![0];
      links.push({
        from: start + match.index,
        to: start + match.index + match[0].length,
        image: match[1] === "!",
        label: line.slice(labelStart, labelStart + match[2].length),
        href,
      });
    }
  });
  return { links, headings };
}

const flatten = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9]+/g, "");

function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

// The one note a broken link most likely meant (a different case, a typo or
// two), as the text to put in the link; null when none or several tie.
function suggestNote(target: string, metas: FileMetadata[]): string | null {
  const wanted = flatten(target.split("/").pop() ?? target);
  if (wanted.length < 3) return null;
  const allowed = Math.max(1, Math.floor(wanted.length / 5));
  let best: FileMetadata[] = [];
  let bestDistance = allowed + 1;
  for (const meta of metas) {
    const name = flatten(meta.name);
    if (Math.abs(name.length - wanted.length) > allowed) continue;
    const gap = distance(wanted, name);
    if (gap < bestDistance) {
      best = [meta];
      bestDistance = gap;
    } else if (gap === bestDistance) best.push(meta);
  }
  if (best.length !== 1) return null;
  const [pick] = best;
  const plain = pick.name.replace(/\.md$/i, "");
  const shared = metas.filter((meta) => meta.name.toLowerCase() === pick.name.toLowerCase()).length > 1;
  return shared ? pick.path.replace(/\.md$/i, "") : plain;
}

function wikilinkIssues(text: string, ctx: CheckContext): DocIssue[] {
  const resolver = createLinkResolver(ctx.fileMetadata);
  const metas = Object.values(ctx.fileMetadata);
  const issues: DocIssue[] = [];
  for (const link of scanWikiLinks(text)) {
    // `[[#Heading]]` points inside this note.
    if (!link.target || MEDIA_TARGET.test(link.target) || resolver.resolve(link.target, ctx.notePath)) continue;
    const suggestion = suggestNote(link.target, metas);
    const shown = link.alias ?? link.target;
    issues.push({
      id: `broken-link:${link.from}`,
      kind: "broken-link",
      line: lineColumnAt(text, link.from).line,
      message: `[[${link.target}]] doesn't match any note${suggestion ? `. Did you mean "${suggestion}"?` : "."}`,
      fix: suggestion
        ? { label: `Link to ${suggestion}`, from: link.targetFrom, to: link.targetTo, insert: suggestion }
        : { label: "Unlink", from: link.from, to: link.to, insert: shown },
    });
  }
  return issues;
}

async function fileLinkIssues(text: string, links: ScannedLink[], ctx: CheckContext): Promise<DocIssue[]> {
  const found = new Map<string, Promise<boolean>>();
  const exists = (path: string) => {
    if (!found.has(path)) found.set(path, ctx.fileExists(path).catch(() => true));
    return found.get(path)!;
  };
  const checked = await Promise.all(links.map(async (link): Promise<DocIssue | null> => {
    if (!link.href || link.href.startsWith("#") || HAS_SCHEME.test(link.href) || link.href.includes("{{")) return null;
    const path = fileLinkPath(link.href, ctx.notePath);
    if (!path) return null;
    const line = lineColumnAt(text, link.from).line;
    if (link.image) {
      if (await exists(path)) return null;
      return {
        id: `missing-image:${link.from}`,
        kind: "missing-image",
        line,
        message: `The image "${path}" can't be found.`,
        fix: { label: "Remove image", from: link.from, to: link.to, insert: "" },
      };
    }
    if (resolveFileLink(link.href, ctx.fileMetadata, ctx.notePath) || (await exists(path))) return null;
    return {
      id: `broken-link:${link.from}`,
      kind: "broken-link",
      line,
      message: `The link to "${path}" doesn't lead to a file in the vault.`,
      fix: { label: "Unlink", from: link.from, to: link.to, insert: link.label || link.href },
    };
  }));
  return checked.filter((issue): issue is DocIssue => issue !== null);
}

// Each heading may go one level deeper than the one before it. The levels are
// worked out as fixed, so a later heading is measured from its corrected parent.
function headingIssues(text: string, headings: ScannedHeading[]): DocIssue[] {
  const issues: DocIssue[] = [];
  let previous = 0;
  for (const heading of headings) {
    const allowed = previous === 0 ? heading.level : Math.min(heading.level, previous + 1);
    if (allowed !== heading.level) {
      issues.push({
        id: `skipped-heading:${heading.from}`,
        kind: "skipped-heading",
        line: lineColumnAt(text, heading.from).line,
        message: `This H${heading.level} follows an H${previous}, skipping a level.`,
        fix: { label: `Make it H${allowed}`, from: heading.from, to: heading.from + heading.hashes, insert: "#".repeat(allowed) },
      });
    }
    previous = allowed;
  }
  return issues;
}

/** Every broken link, missing image and skipped heading in the note, by line. */
export async function checkDocument(text: string, ctx: CheckContext): Promise<DocIssue[]> {
  const { links, headings } = scanBody(text);
  const issues = [
    ...wikilinkIssues(text, ctx),
    ...(await fileLinkIssues(text, links, ctx)),
    ...headingIssues(text, headings),
  ];
  return issues.sort((a, b) => a.line - b.line || a.fix.from - b.fix.from);
}

/** `fileExists` for a vault: walks the folders; any failure reads as "missing". */
export function createVaultFileExists(vault: FileSystemDirectoryHandle): (path: string) => Promise<boolean> {
  const folders = new Map<string, Promise<FileSystemDirectoryHandle | null>>();
  const folder = (segments: string[]): Promise<FileSystemDirectoryHandle | null> => {
    const key = segments.join("/");
    if (!segments.length) return Promise.resolve(vault);
    if (!folders.has(key)) {
      folders.set(key, folder(segments.slice(0, -1)).then((parent) => parent?.getDirectoryHandle(segments[segments.length - 1]).catch(() => null) ?? null));
    }
    return folders.get(key)!;
  };
  return async (path) => {
    const segments = path.split("/").filter(Boolean);
    const name = segments.pop();
    if (!name) return false;
    const parent = await folder(segments);
    if (!parent) return false;
    return parent.getFileHandle(name).then(() => true, () => false);
  };
}

/** The fixes as non-overlapping edits, in document order. */
export function fixesAsChanges(issues: DocIssue[]): DocFix[] {
  const changes: DocFix[] = [];
  let end = -1;
  for (const { fix } of [...issues].sort((a, b) => a.fix.from - b.fix.from)) {
    if (fix.from < end) continue;
    changes.push(fix);
    end = fix.to;
  }
  return changes;
}
