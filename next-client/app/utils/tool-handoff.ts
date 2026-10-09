// Work handed from a tool page (/tools/*) to the editor: the tool writes it
// to the tab's sessionStorage and navigates to /editor in the same tab, where
// useToolHandoff reads it once into the draft. Nothing leaves the browser.
// Shared by the tool pages and the editor, so it imports no atoms or editor
// code.

export const TOOL_HANDOFF_KEY = "hermes_tool_handoff";
// Markdown length. Far inside sessionStorage's ~5 MB, and leaves room in
// `openFiles` (localStorage), where the draft is kept afterwards.
export const MAX_HANDOFF_CHARS = 200_000;
export const HANDOFF_TTL_MS = 15 * 60_000;
const MAX_TITLE_CHARS = 60;
// Tolerated clock skew for a payload stamped "in the future".
const FUTURE_SKEW_MS = 60_000;

const SOURCES = ["markdown-table", "mermaid"] as const;
export type ToolHandoffSource = (typeof SOURCES)[number];

export interface ToolHandoff {
  v: 1;
  source: ToolHandoffSource;
  // 1–60 characters; becomes the draft's file name.
  title: string;
  markdown: string;
  createdAt: number;
}

export type WriteResult = "ok" | "too-large" | "storage-error";

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function buildToolHandoff(
  source: ToolHandoffSource,
  title: string,
  markdown: string,
  now = Date.now(),
): ToolHandoff {
  return { v: 1, source, title, markdown, createdAt: now };
}

// The payload, or null when it is malformed, empty, oversized or stale.
export function parseToolHandoff(raw: string | null, now = Date.now()): ToolHandoff | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const { v, source, title, markdown, createdAt } = value as Record<string, unknown>;
  if (v !== 1) return null;
  if (typeof source !== "string" || !(SOURCES as readonly string[]).includes(source)) return null;
  if (typeof title !== "string" || title.length < 1 || title.length > MAX_TITLE_CHARS) return null;
  if (typeof markdown !== "string" || !markdown.trim() || markdown.length > MAX_HANDOFF_CHARS) return null;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return null;
  if (now - createdAt > HANDOFF_TTL_MS || createdAt - now > FUTURE_SKEW_MS) return null;
  return { v: 1, source: source as ToolHandoffSource, title, markdown, createdAt };
}

export function writeToolHandoff(handoff: ToolHandoff, storage = sessionStore()): WriteResult {
  if (handoff.markdown.length > MAX_HANDOFF_CHARS) return "too-large";
  if (!storage) return "storage-error";
  try {
    storage.setItem(TOOL_HANDOFF_KEY, JSON.stringify(handoff));
    return "ok";
  } catch {
    return "storage-error";
  }
}

// Reads the pending payload; an invalid one is removed so it's never retried.
export function readToolHandoff(storage = sessionStore(), now = Date.now()): ToolHandoff | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(TOOL_HANDOFF_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const handoff = parseToolHandoff(raw, now);
  if (!handoff) clearToolHandoff(storage);
  return handoff;
}

export function clearToolHandoff(storage = sessionStore()): void {
  try {
    storage?.removeItem(TOOL_HANDOFF_KEY);
  } catch {
    // Blocked storage: nothing to clear.
  }
}
