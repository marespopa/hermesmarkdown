// Keeps [[wikilinks]] working after notes or folders are renamed or moved.
// Minimal-diff rule: an occurrence is rewritten only if, as written, it
// resolved to note T before and no longer resolves to T's new path after.
import type { FileMetadata } from "@/app/atoms/metadata";
import { remapPath } from "@/app/atoms/utils";
import { createLinkResolver, type LinkResolver } from "./link-resolver";
import { parseLinkTarget, scanWikiLinks } from "./wikilink-scan";

export interface PathMove {
  from: string;
  to: string;
}

/** Applies the first move whose prefix matches; else the path itself. */
export function mapMovedPath(path: string, moves: PathMove[]): string {
  for (const move of moves) {
    const mapped = remapPath(path, move.from, move.to);
    if (mapped !== null) return mapped;
  }
  return path;
}

function folderOf(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

// True when a link written with a `/` still spells `expected` as a vault
// path or a path relative to the source's folder (not just by basename).
function spellsPath(target: string, expected: string, sourceNew: string): boolean {
  const file = (target.endsWith(".md") ? target : target + ".md").toLowerCase();
  const folder = folderOf(sourceNew);
  const want = expected.toLowerCase();
  return file === want || (folder !== "" && `${folder}/${file}`.toLowerCase() === want);
}

// True when `target`, written in a note moving `sourceOld` → `sourceNew`,
// stops pointing at the note it pointed at. A path link whose path went
// stale counts too, even if its basename still finds the note.
function breaks(
  target: string,
  sourceOld: string,
  sourceNew: string,
  before: LinkResolver,
  after: LinkResolver,
  moves: PathMove[],
): string | null {
  const hit = before.resolve(target, sourceOld);
  if (!hit) return null;
  const expected = mapMovedPath(hit.path, moves);
  if (after.resolve(target, sourceNew)?.path !== expected) return expected;
  return target.includes("/") && !spellsPath(target, expected, sourceNew) ? expected : null;
}

/** Old source paths whose metadata links may need rewriting. */
export function findRewriteCandidates(
  before: Record<string, FileMetadata>,
  after: Record<string, FileMetadata>,
  moves: PathMove[],
): string[] {
  const beforeResolver = createLinkResolver(before);
  const afterResolver = createLinkResolver(after);
  const result: string[] = [];
  for (const meta of Object.values(before)) {
    const newPath = mapMovedPath(meta.path, moves);
    if (!after[newPath]) continue;
    const needs = (meta.links ?? []).some((link) => {
      const { target } = parseLinkTarget(link);
      return target !== "" && breaks(target, meta.path, newPath, beforeResolver, afterResolver, moves) !== null;
    });
    if (needs) result.push(meta.path);
  }
  return result;
}

function basename(path: string): string {
  return path.split("/").pop() || path;
}

// The link text for `expected`: the bare new name when that resolves to it
// from the source, else the full vault path. `.md` kept if it was written.
function formatTarget(original: string, expected: string, sourceNew: string, after: LinkResolver): string {
  const keepExt = original.endsWith(".md");
  const strip = (value: string) => (keepExt ? value : value.replace(/\.md$/, ""));
  if (!original.includes("/")) {
    const bare = strip(basename(expected));
    if (after.resolve(bare, sourceNew)?.path === expected) return bare;
  }
  return strip(expected);
}

/** The rewritten text, or null when nothing changes. */
export function rewriteLinksInText(
  text: string,
  args: {
    sourceOldPath: string;
    sourceNewPath: string;
    before: LinkResolver;
    after: LinkResolver;
    moves: PathMove[];
  },
): string | null {
  const { sourceOldPath, sourceNewPath, before, after, moves } = args;
  const edits: { from: number; to: number; value: string }[] = [];
  for (const occurrence of scanWikiLinks(text)) {
    if (!occurrence.target) continue;
    const expected = breaks(occurrence.target, sourceOldPath, sourceNewPath, before, after, moves);
    if (expected === null) continue;
    edits.push({
      from: occurrence.targetFrom,
      to: occurrence.targetTo,
      value: formatTarget(occurrence.target, expected, sourceNewPath, after),
    });
  }
  if (edits.length === 0) return null;
  let result = text;
  for (const edit of edits.reverse()) result = result.slice(0, edit.from) + edit.value + result.slice(edit.to);
  return result === text ? null : result;
}
