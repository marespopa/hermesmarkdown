import type { FileMetadata } from "@/app/atoms/metadata";
import { isSensitiveFrontmatter } from "./note-privacy";

// The display factory: the one place that decides how a note appears in a
// listing (home feed, command palette, Tasks page). Surfaces read the items
// this builds instead of slicing note content themselves. Any future note
// preview (e.g. a wiki-link hover card) must go through createNoteDisplayItem.

export type PrivacyLevel = "show_title" | "blurred" | "hidden";

export const PRIVACY_LEVELS: readonly PrivacyLevel[] = ["show_title", "blurred", "hidden"];

export function normalizePrivacyLevel(value: unknown): PrivacyLevel {
  return PRIVACY_LEVELS.includes(value as PrivacyLevel) ? (value as PrivacyLevel) : "show_title";
}

/** Fixed length, so the bullet count can't reveal how long the preview is. */
export const MASKED_PREVIEW = "•••• ••••••• ••••• •••••••• •••";
export const MASKED_TEXT = "••••••••";
export const UNTITLED_SENSITIVE_TITLE = "Untitled sensitive note";

export type PreviewStyle = "plain" | "masked" | "blurred";

export interface NoteDisplayItem {
  /** Vault path. */
  id: string;
  title: string;
  /** MASKED_PREVIEW when masked; the real excerpt when plain or blurred. */
  preview: string;
  isSensitive: boolean;
  /** previewStyle === "masked". */
  isMasked: boolean;
  previewStyle: PreviewStyle;
  /** False until the indexer has parsed the note (no preview yet). */
  isIndexed: boolean;
}

/**
 * Frontmatter `title` (the worker stores the first H1 there), else the file
 * name without `.md`. A sensitive note with neither gets a generic title; it
 * never falls back to body text.
 */
export function noteDisplayTitle(
  meta: Pick<FileMetadata, "name" | "frontmatter">,
  isSensitive: boolean,
): string {
  const title = meta.frontmatter?.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  const name = (meta.name ?? "").replace(/\.md$/i, "");
  if (isSensitive && !name.trim()) return UNTITLED_SENSITIVE_TITLE;
  return name;
}

/** The display item for one note, or null when the privacy level excludes it. */
export function createNoteDisplayItem(meta: FileMetadata, level: PrivacyLevel): NoteDisplayItem | null {
  const isSensitive = isSensitiveFrontmatter(meta.frontmatter);
  if (isSensitive && level === "hidden") return null;
  const previewStyle: PreviewStyle = !isSensitive ? "plain" : level === "blurred" ? "blurred" : "masked";
  const isMasked = previewStyle === "masked";
  return {
    id: meta.path,
    title: noteDisplayTitle(meta, isSensitive),
    preview: isMasked ? MASKED_PREVIEW : (meta.preview ?? ""),
    isSensitive,
    isMasked,
    previewStyle,
    isIndexed: meta.preview !== undefined,
  };
}

/** Display items keyed by path; excluded notes are absent from the map. */
export function buildNoteDisplayItems(
  metadata: Record<string, FileMetadata>,
  level: PrivacyLevel,
): Map<string, NoteDisplayItem> {
  const items = new Map<string, NoteDisplayItem>();
  for (const meta of Object.values(metadata)) {
    const item = createNoteDisplayItem(meta, level);
    if (item) items.set(item.id, item);
  }
  return items;
}

/** Replaces a task's body text and tags with masks for listings. */
export function maskTask<T extends { text: string; tags: string[] }>(task: T): T {
  return { ...task, text: MASKED_TEXT, tags: [] };
}
