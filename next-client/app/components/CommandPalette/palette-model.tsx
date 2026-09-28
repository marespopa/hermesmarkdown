"use client";

import type { PalettePinnedItem, Theme } from "@/app/atoms/ui-atoms";
import React from "react";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import type { Command } from "./CommandPaletteContext";

// Command palette constants, row/scope types, and small pure helpers.
export const MAX_VISIBLE_ROWS = 12;
export const MAX_PINS = 5;
export const COMMAND_MODE_DEFAULT_ORDER = [
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
] as const;

export type Scope = (typeof scopes)[number]["id"];
export type FileResult = { path: string; name: string; handle: FileSystemFileHandle; tags: string[] };
type TagMatch = { tag: string; score: number; indices: number[] };
export type TaggedFileMatch = { file: FileResult; matches: TagMatch[]; score: number };
export type Row =
  | { kind: "command"; id: string; label: string; detail: string; command: Command; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "file"; id: string; label: string; detail: string; file: FileResult; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "task"; id: string; label: string; detail: string; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "heading"; id: string; label: string; detail: string; from: number; titleIndices: number[]; detailIndices: number[]; score: number };

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
