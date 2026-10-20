"use client";

import type { DisplayTask } from "@/app/atoms/task-atoms";
import type { PalettePinnedItem } from "@/app/atoms/ui-atoms";
import { MASKED_TEXT } from "@/app/utils/note-display";
import type { ContentHit } from "@/app/workers/content-search-protocol";
import type { TemplateEntry } from "@/app/utils/templates/template-registry";
import React from "react";
import { fuzzyMatch, matchCommand } from "./command-search";
import type { Command } from "./CommandPaletteContext";

// Command palette constants, row/scope types, and small pure helpers.
export const MAX_VISIBLE_ROWS = 12;
// Shared by the palette input (when notes can be created) and the search
// pill (SearchPill) that morphs into it.
export const SEARCH_OR_CREATE_PLACEHOLDER = "Search or create a note…";
// A key cap: the toolbar pill's ⌘K, row shortcuts and the footer's hints.
export const SEARCH_KBD_CLASS = "hidden shrink-0 rounded border border-edge px-1.5 py-0.5 font-mono text-ui-micro text-fg-muted sm:inline";
// The palette's own field: the panel's top edge, not a pill inside it.
export const PALETTE_FIELD_CLASS = "flex h-14 shrink-0 items-center gap-3 border-b border-edge-subtle bg-input-bg dark:bg-transparent pl-5 pr-3 font-sans";
export const MAX_PINS = 5;
// The palette's top-level menu, listed after the pinned and recent notes
// when it opens, and first in an empty `>` list: what works on the note,
// then, set apart, the pages it can take you to (`opens`). A command that
// isn't registered is skipped (no vault for Insert Template, AI Features
// off, and of each pair of page ids only the one for the route you're on).
export const TOP_LEVEL_ACTIONS = [
  "search-notes",
  "ai-menu",
  "new-file",
  "insert-template",
  "toggle-focus-mode",
];
export const TOP_LEVEL_PAGES = [
  "open-tasks-panel",
  "go-tasks",
  "open-templates",
  "go-templates",
  "open-settings",
  "open-documentation",
];
export const TOP_LEVEL_MENU = [...TOP_LEVEL_ACTIONS, ...TOP_LEVEL_PAGES];

// A row's group in a list that's set apart by hairlines: notes, actions,
// or the commands that open a page or a tab.
export function rowGroup(row: Row) {
  if (row.kind !== "command") return "notes";
  return row.command.opens ? "pages" : "actions";
}

// The search modes, in the footer's order (PaletteFooter shows them as
// chips); each is also its prefix typed first in the field.
export const SCOPES = [
  { id: "tag", prefix: "#", label: "Tags" },
  { id: "task", prefix: "!", label: "Tasks" },
  { id: "heading", prefix: "@", label: "Headings" },
  { id: "content", prefix: "/", label: "Text" },
  { id: "template", prefix: "~", label: "Templates" },
  { id: "command", prefix: ">", label: "Commands" },
] as const;

export type Scope = (typeof SCOPES)[number]["id"];
export type FileResult = { path: string; name: string; handle: FileSystemFileHandle; tags: string[]; isPrivate: boolean };
type TagMatch = { tag: string; score: number; indices: number[] };
type TaggedFileMatch = { file: FileResult; matches: TagMatch[]; score: number };
export type Row =
  | { kind: "command"; id: string; label: string; detail: string; command: Command; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "file"; id: string; label: string; detail: string; file: FileResult; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "task"; id: string; label: string; detail: string; isMasked: boolean; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "heading"; id: string; label: string; detail: string; from: number; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "template"; id: string; label: string; detail: string; entry: TemplateEntry; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "create"; id: string; label: string; detail: string; title: string; titleIndices: number[]; detailIndices: number[]; score: number }
  // A matching line from the `/` scope: label = snippet, detail = `name:line`.
  | { kind: "content"; id: string; label: string; detail: string; file: FileResult; line: number; column: number; titleIndices: number[]; detailIndices: number[]; score: number };
export type ContentRow = Extract<Row, { kind: "content" }>;
export type CommandRow = Extract<Row, { kind: "command" }>;

export function commandRow(command: Command, titleIndices: number[] = [], score = 0): CommandRow {
  return { kind: "command", id: command.id, label: command.label, detail: command.disabledReason ?? command.category ?? "Command", command, titleIndices, detailIndices: [], score };
}

// A menu command's rows (`subcommands`): its list as given for an empty
// query. A query searches the list and the actions inside its own menus,
// so "grammar" finds Fix spelling and grammar from the AI menu's top.
export function buildMenuRows(query: string, menu: Command): CommandRow[] {
  const children = menu.subcommands ?? [];
  if (!query) return children.map((command) => commandRow(command));
  const leaves = (commands: Command[]): Command[] =>
    commands.flatMap((command) => (command.subcommands ? leaves(command.subcommands) : [command]));
  const candidates = [...children, ...children.flatMap((command) => (command.subcommands ? leaves(command.subcommands) : []))];
  return candidates.map((command) => {
    const match = matchCommand(query, command);
    return match ? commandRow(command, match.indices, match.score) : null;
  }).filter((row): row is CommandRow => row !== null)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

// The "Create '…'" row for a file query: offered when a create handler is
// registered and no note already has exactly that title.
export function buildCreateRow(query: string, files: FileResult[]): Extract<Row, { kind: "create" }> | null {
  const title = query.trim();
  if (!title) return null;
  const wanted = title.toLowerCase();
  if (files.some((file) => file.name.replace(/\.md$/i, "").toLowerCase() === wanted)) return null;
  return { kind: "create", id: `create:${title}`, label: `Create "${title}"`, detail: "New note", title, titleIndices: [], detailIndices: [], score: 0 };
}

// The `#` scope's rows: notes carrying every tag the query names (space-
// or comma-separated, each matched fuzzily), the matched tags as detail.
export function buildTagRows(query: string, filesByTag: Map<string, FileResult[]>): Extract<Row, { kind: "file" }>[] {
  const tagQueries = query.split(/[\s,]+/).map((term) => term.replace(/^#/, "")).filter(Boolean);
  let matchedFiles: Map<string, TaggedFileMatch> | null = null;
  for (const tagQuery of tagQueries.length ? tagQueries : [""]) {
    const queryMatches = new Map<string, TaggedFileMatch>();
    filesByTag.forEach((taggedFiles, tag) => {
      const match = fuzzyMatch(tagQuery, tag);
      if (!match) return;
      taggedFiles.forEach((file) => {
        const previous = queryMatches.get(file.path);
        if (!previous || match.score > previous.score) {
          queryMatches.set(file.path, { file, matches: [{ tag, score: match.score, indices: match.indices }], score: match.score });
        }
      });
    });
    if (!matchedFiles) {
      matchedFiles = queryMatches;
      continue;
    }
    matchedFiles.forEach((previous, path) => {
      const next = queryMatches.get(path);
      if (!next) matchedFiles!.delete(path);
      else matchedFiles!.set(path, { file: previous.file, matches: [...previous.matches, ...next.matches], score: previous.score + next.score });
    });
  }
  return Array.from(matchedFiles?.values() ?? [])
    .map(({ file, matches, score }) => {
      let offset = 0;
      const detailIndices = matches.flatMap(({ tag, indices }) => {
        const shiftedIndices = indices.map((index) => offset + index + 1);
        offset += tag.length + 2;
        return shiftedIndices;
      });
      return {
        kind: "file" as const, id: file.path, label: file.name, detail: matches.map(({ tag }) => `#${tag}`).join(" "), file,
        titleIndices: [] as number[], detailIndices, score,
      };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

// The `~` scope's rows: the vault's templates by name (or pack), loose
// ones and packs in the registry's order for the empty query.
export function buildTemplateRows(query: string, templates: TemplateEntry[]): Extract<Row, { kind: "template" }>[] {
  return templates.map((entry, order) => {
    const nameMatch = fuzzyMatch(query, entry.name);
    const packMatch = !nameMatch && entry.pack ? fuzzyMatch(query, entry.pack) : null;
    const match = nameMatch ?? packMatch;
    if (!match) return null;
    return {
      kind: "template" as const, id: entry.path, label: entry.name, detail: entry.pack ?? "", entry,
      titleIndices: nameMatch?.indices ?? [], detailIndices: packMatch?.indices ?? [], score: query ? match.score : -order,
    };
  }).filter((row): row is Extract<Row, { kind: "template" }> => row !== null)
    .sort((a, b) => b.score - a.score);
}

// The `!` scope's rows. A masked task (from a private note) is listed only
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
// palette doesn't list (removed, hidden or private) are dropped.
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
    <strong key={`${character}-${index}`} className={matches.has(index) ? "font-bold text-fg" : "font-normal"}>
      {character}
    </strong>
  ))}</>;
}

export function scopeFromPrefix(value: string) {
  const scope = SCOPES.find((candidate) => "prefix" in candidate && candidate.prefix === value[0]);
  return scope ? { scope: scope.id, query: value.slice(1).trimStart() } : null;
}

export function scopePrefix(scope: Scope) {
  return SCOPES.find((candidate) => candidate.id === scope)?.prefix ?? "";
}

export function pinnedKey(item: PalettePinnedItem) {
  return `${item.kind}:${item.id}`;
}

export function parentFolder(path: string) {
  return path.split("/").slice(0, -1).join("/");
}
