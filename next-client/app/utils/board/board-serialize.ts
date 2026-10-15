// Deterministic board serialization: the same scene always gives the same
// bytes, so saves don't churn diffs or sync. Pure; no Excalidraw imports.
import type { BoardAppState, BoardDoc, BoardElement, BoardScene } from "./board-format";

export const BOARD_APP_STATE_KEYS = ["viewBackgroundColor", "gridModeEnabled", "gridSize", "gridStep"] as const;

const ROUNDED_KEYS = new Set(["x", "y", "width", "height"]);

function round2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function roundPoints(value: unknown): unknown {
  if (typeof value === "number") return round2(value);
  if (Array.isArray(value)) return value.map(roundPoints);
  return value;
}

// Sorts plain-object keys alphabetically at every depth; arrays keep order.
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Element with `id`, `type` first, the rest sorted, and coordinates rounded. */
export function normalizeElement(el: BoardElement): BoardElement {
  const out: Record<string, unknown> = { id: el.id, type: el.type };
  for (const key of Object.keys(el).sort()) {
    if (key === "id" || key === "type") continue;
    const value = el[key];
    if (value === undefined) continue;
    if (ROUNDED_KEYS.has(key) && typeof value === "number") out[key] = round2(value);
    else if (key === "points") out[key] = roundPoints(value);
    else out[key] = sortDeep(value);
  }
  return out as BoardElement;
}

/** Only the allow-listed canvas settings, sorted by key. */
export function pickBoardAppState(appState: Record<string, unknown> | undefined): BoardAppState {
  const out: Record<string, unknown> = {};
  if (!appState) return out;
  for (const key of [...BOARD_APP_STATE_KEYS].sort()) {
    if (appState[key] !== undefined) out[key] = appState[key];
  }
  return out as BoardAppState;
}

/** The fence body: a 4-line header, one element per line, then `]}`. */
export function serializeScene(scene: BoardScene): string {
  const elements = scene.elements.filter((el) => !el.isDeleted).map((el) => JSON.stringify(normalizeElement(el)));
  const header = [
    '{"type":"hermes-board","version":1,"source":"excalidraw",',
    `"appState":${JSON.stringify(pickBoardAppState(scene.appState as Record<string, unknown>))},`,
    `"files":${JSON.stringify(scene.files ?? {})},`,
    '"elements":[',
  ];
  return [...header, ...elements.map((line, i) => (i < elements.length - 1 ? `${line},` : line)), "]}"].join("\n");
}

/** head + fenced scene + tail. */
export function serializeBoard(doc: BoardDoc, scene: BoardScene): string {
  return `${doc.head}\`\`\`hermes-board\n${serializeScene(scene)}\n\`\`\`${doc.tail}`;
}
