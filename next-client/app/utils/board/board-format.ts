// Board file format: a Markdown note with `hermes: board` frontmatter and one
// ```hermes-board fenced JSON scene. Pure; no `@excalidraw/*` imports.
import { migrateBoard } from "./migrate";
import { serializeBoard } from "./board-serialize";
import type { BOARD_APP_STATE_KEYS } from "./board-serialize";

export { serializeBoard };

export const BOARD_FENCE_LANG = "hermes-board";

export type BoardElement = { id: string; type: string; isDeleted?: boolean } & Record<string, unknown>;
export type BoardAppState = Partial<Record<(typeof BOARD_APP_STATE_KEYS)[number], unknown>>;
export interface BoardScene {
  appState: BoardAppState;
  elements: BoardElement[];
  files: Record<string, unknown>;
}
/** Text before / after the fence. */
export interface BoardDoc {
  head: string;
  tail: string;
}
export type BoardParse =
  | { ok: true; doc: BoardDoc; scene: BoardScene }
  | { ok: false; error: "conflict" | "invalid" };

const EMPTY_FENCE =
  '```hermes-board\n{"type":"hermes-board","version":1,"source":"excalidraw",\n"appState":{},\n"files":{},\n"elements":[\n]}\n```';
export const NEW_BOARD_MARKDOWN = `---\nhermes: board\nboard-version: 1\n---\n\n${EMPTY_FENCE}\n`;

const OPEN_FENCE = /^```hermes-board[ \t]*$/;
const CLOSE_FENCE = /^```[ \t]*$/;
const MARKER_LINE = /^(<{7}|={7}|>{7})(\s|$)/;
const FILE_MARKER = /^(<{7}|>{7}) /m;

interface FenceSpan {
  open: number; // line index of the opening line
  close: number; // line index of the closing line (lines.length when unclosed)
}

function findFences(lines: string[]): FenceSpan[] {
  const spans: FenceSpan[] = [];
  let i = 0;
  while (i < lines.length) {
    if (OPEN_FENCE.test(lines[i])) {
      let close = i + 1;
      while (close < lines.length && !CLOSE_FENCE.test(lines[close])) close++;
      spans.push({ open: i, close });
      i = close + 1;
    } else i++;
  }
  return spans;
}

export function hasConflictMarkers(text: string): boolean {
  return text.split("\n").some((line) => MARKER_LINE.test(line));
}

export function parseBoard(markdown: string): BoardParse {
  const lines = markdown.split("\n");
  const first = findFences(lines)[0];
  if (!first) {
    const trimmed = markdown.replace(/\s+$/, "");
    // A blank file gets the board frontmatter so it stays a board once saved.
    return {
      ok: true,
      doc: { head: trimmed ? `${trimmed}\n\n` : NEW_BOARD_MARKDOWN.slice(0, NEW_BOARD_MARKDOWN.indexOf("```")), tail: "\n" },
      scene: { appState: {}, elements: [], files: {} },
    };
  }
  const body = lines.slice(first.open + 1, first.close);
  if (body.some((line) => MARKER_LINE.test(line))) return { ok: false, error: "conflict" };
  const fail = (): BoardParse => ({ ok: false, error: FILE_MARKER.test(markdown) ? "conflict" : "invalid" });
  if (first.close >= lines.length) return fail(); // unclosed fence
  let scene;
  try {
    scene = migrateBoard(JSON.parse(body.join("\n")));
  } catch {
    return fail();
  }
  if (!scene) return fail();
  const head = lines
    .slice(0, first.open)
    .map((l) => `${l}\n`)
    .join("");
  const tailLines = lines.slice(first.close + 1);
  return { ok: true, doc: { head, tail: tailLines.length ? `\n${tailLines.join("\n")}` : "" }, scene };
}

/** Blanks every hermes-board fence line (opening through closing); the line count is unchanged. */
export function stripBoardFence(markdown: string): string {
  if (!markdown.includes("```hermes-board")) return markdown;
  const lines = markdown.split("\n");
  for (const { open, close } of findFences(lines)) {
    for (let i = open; i <= close && i < lines.length; i++) lines[i] = "";
  }
  return lines.join("\n");
}

/** Prose plus a one-line summary, for AI reading. */
export function boardTextForReading(markdown: string): string {
  if (!markdown.includes("```hermes-board")) return markdown;
  const lines = markdown.split("\n");
  const drop = new Set<number>();
  for (const { open, close } of findFences(lines)) {
    for (let i = open; i <= close && i < lines.length; i++) drop.add(i);
  }
  const prose = lines
    .filter((_, i) => !drop.has(i))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const parsed = parseBoard(markdown);
  const summary = parsed.ok
    ? `(board with ${parsed.scene.elements.filter((el) => !el.isDeleted).length} elements)`
    : "(board that couldn't be read)";
  return `${prose}\n${summary}`;
}
