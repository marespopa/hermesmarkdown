"use client";

import type { DisplayTask } from "@/app/atoms/task-atoms";
import type { PalettePinnedItem, Theme } from "@/app/atoms/ui-atoms";
import { MASKED_TEXT } from "@/app/utils/note-display";
import type { ContentHit } from "@/app/workers/content-search-protocol";
import React from "react";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import { fuzzyMatch } from "./command-search";
import type { Command } from "./CommandPaletteContext";

// Command palette constants, row/scope types, and small pure helpers.
export const MAX_VISIBLE_ROWS = 12;
// Shared by the palette input (when notes can be created) and the home
// feed's search pill that morphs into it.
export const SEARCH_OR_CREATE_PLACEHOLDER = "Search or create a note…";
// One search-pill look for the palette field and the home feed's pill (the
// same element as far as the user is concerned; they morph into each other).
export const SEARCH_PILL_CLASS = "flex items-center gap-1 rounded-full border border-edge bg-chrome p-1.5";
export const SEARCH_FIELD_CLASS = "flex h-10 min-w-0 flex-1 items-center gap-3 rounded-full pl-4 pr-1";
export const SEARCH_KBD_CLASS = "hidden shrink-0 rounded border border-edge px-1.5 py-0.5 font-mono text-ui-micro text-fg-muted sm:inline";
export const COMMAND_TOGGLE_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold transition-colors";
export const MAX_PINS = 5;
export const COMMAND_MODE_DEFAULT_ORDER = [
  "open-home-feed",
  "new-file",
  "save-file",
  "open-explorer",
  "open-vault",
  "open-documentation",
];
export const THEME_CYCLE: { value: Theme; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "system", label: "Theme: System", Icon: HiOutlineDesktopComputer },
  { value: "light", label: "Theme: Light", Icon: HiOutlineSun },
  { value: "dark", label: "Theme: Dark", Icon: HiOutlineMoon },
];

const scopes = [
  { id: "tag", prefix: "#", label: "Tags" },
  { id: "command", prefix: ">", label: "Commands" },
  { id: "task", prefix: "!", label: "Tasks" },
  { id: "heading", prefix: "@", label: "Headings" },
  { id: "content", prefix: "/", label: "Note text" },
] as const;

export type Scope = (typeof scopes)[number]["id"];
export type FileResult = { path: string; name: string; handle: FileSystemFileHandle; tags: string[]; isSensitive: boolean };
type TagMatch = { tag: string; score: number; indices: number[] };
export type TaggedFileMatch = { file: FileResult; matches: TagMatch[]; score: number };
export type Row =
  | { kind: "command"; id: string; label: string; detail: string; command: Command; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "file"; id: string; label: string; detail: string; file: FileResult; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "task"; id: string; label: string; detail: string; isMasked: boolean; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "heading"; id: string; label: string; detail: string; from: number; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "create"; id: string; label: string; detail: string; title: string; titleIndices: number[]; detailIndices: number[]; score: number }
  // A matching line from the `/` scope: label = snippet, detail = `name:line`.
  | { kind: "content"; id: string; label: string; detail: string; file: FileResult; line: number; column: number; titleIndices: number[]; detailIndices: number[]; score: number };
export type ContentRow = Extract<Row, { kind: "content" }>;

// The "Create '…'" row for a file query: offered when a create handler is
// registered and no note already has exactly that title.
export function buildCreateRow(query: string, files: FileResult[]): Extract<Row, { kind: "create" }> | null {
  const title = query.trim();
  if (!title) return null;
  const wanted = title.toLowerCase();
  if (files.some((file) => file.name.replace(/\.md$/i, "").toLowerCase() === wanted)) return null;
  return { kind: "create", id: `create:${title}`, label: `Create "${title}"`, detail: "New note", title, titleIndices: [], detailIndices: [], score: 0 };
}

// The `!` scope's rows. A masked task (from a sensitive note) is listed only
// for the empty query, as bullets, and never matched by its text.
export function buildTaskRows(query: string, tasks: DisplayTask[]): Extract<Row, { kind: "task" }>[] {
  return tasks.map((task) => {
    const detail = `${task.path}:${task.line + 1}`;
    if (task.isMasked) {
      return query ? null : { kind: "task" as const, id: task.id, label: MASKED_TEXT, detail, isMasked: true, titleIndices: [] as number[], detailIndices: [] as number[], score: 0 };
    }
    const match = fuzzyMatch(query, task.text);
    return match ? { kind: "task" as const, id: task.id, label: task.text || "(empty task)", detail, isMasked: false, titleIndices: match.indices, detailIndices: [] as number[], score: match.score } : null;
  }).filter((row): row is Extract<Row, { kind: "task" }> => row !== null)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

// The `/` scope's rows, in the worker's rank order. Hits for notes the
// palette doesn't list (removed, hidden or sensitive) are dropped.
export function buildContentRows(hits: ContentHit[], filesByPath: Map<string, FileResult>): ContentRow[] {
  return hits.flatMap((hit) => {
    const file = filesByPath.get(hit.path);
    if (!file) return [];
    return [{
      kind: "content" as const, id: `${hit.path}:${hit.line}`, label: hit.snippet, detail: `${file.name}:${hit.line}`,
      file, line: hit.line, column: hit.column, titleIndices: hit.highlights, detailIndices: [] as number[], score: hit.score,
    }];
  });
}

export function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  const matches = new Set(indices);
  return <>{text.split("").map((character, index) => (
    <strong key={`${character}-${index}`} className={matches.has(index) ? "font-bold text-accent" : "font-normal"}>
      {character}
    </strong>
  ))}</>;
}

export function scopeFromPrefix(value: string) {
  const scope = scopes.find((candidate) => "prefix" in candidate && candidate.prefix === value[0]);
  return scope ? { scope: scope.id, query: value.slice(1).trimStart() } : null;
}

export function scopePrefix(scope: Scope) {
  return scopes.find((candidate) => candidate.id === scope)?.prefix ?? "";
}

export function pinnedKey(item: PalettePinnedItem) {
  return `${item.kind}:${item.id}`;
}

export function parentFolder(path: string) {
  return path.split("/").slice(0, -1).join("/");
}
