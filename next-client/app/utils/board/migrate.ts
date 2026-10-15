// The single upgrade point for the board JSON format. Pure.
import type { BoardScene } from "./board-format";

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Validates parsed fence JSON and upgrades it to the current version; null when unsupported. */
export function migrateBoard(raw: unknown): BoardScene | null {
  if (!isObject(raw) || raw.type !== "hermes-board" || raw.version !== 1) return null;
  if (!Array.isArray(raw.elements)) return null;
  if (raw.appState !== undefined && !isObject(raw.appState)) return null;
  if (raw.files !== undefined && !isObject(raw.files)) return null;
  return {
    appState: (raw.appState ?? {}) as BoardScene["appState"],
    elements: raw.elements as BoardScene["elements"],
    files: (raw.files ?? {}) as BoardScene["files"],
  };
}
