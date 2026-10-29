import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ProjectCheckId } from "@/app/services/project-checks";

// The AI companion (app/editor/components/companion/): a panel docked on the
// window's trailing edge, hidden until opened. Open, it takes room and the
// page moves over (`--content-right`, EditorShell), as the sidebar does on the
// leading edge. Remembered, as the sidebar is.
export const atom_companionOpen = atomWithStorage<boolean>("companionOpen", false);

export const COMPANION_MIN_WIDTH = 320;
export const COMPANION_MAX_WIDTH = 640;
export const COMPANION_DEFAULT_WIDTH = 380;
const clampCompanionWidth = (width: number) =>
  Math.round(Math.min(COMPANION_MAX_WIDTH, Math.max(COMPANION_MIN_WIDTH, width)));
const atom_companionWidthStored = atomWithStorage<number>("companionWidth", COMPANION_DEFAULT_WIDTH);
// Read and written within the bounds.
export const atom_companionWidth = atom(
  (get) => clampCompanionWidth(get(atom_companionWidthStored)),
  (_get, set, width: number) => set(atom_companionWidthStored, clampCompanionWidth(width)),
);

// What an entry point (Ask AI: Ctrl/Cmd+J or the palette, the slash menu, the
// selection toolbar's Ask AI, the mobile file bar) hands the companion when it
// opens it: the note in front and the text selected in it, which the composer
// shows as context chips. `seq` tells one request from the next.
export interface CompanionRequest {
  seq: number;
  path: string | null;
  selection: string;
}
export const atom_companionRequest = atom<CompanionRequest | null>(null);

// Opens the companion with the given context (or none).
export const atom_openCompanion = atom(
  null,
  (get, set, context: { path?: string | null; selection?: string } = {}) => {
    set(atom_companionRequest, {
      seq: (get(atom_companionRequest)?.seq ?? 0) + 1,
      path: context.path ?? null,
      selection: context.selection ?? "",
    });
    set(atom_companionOpen, true);
  },
);

// A companion action asked for from outside the panel (the palette's New AI
// chat and Summarize AI chat); the panel's chat runs it. `seq` tells one
// request from the next.
export interface CompanionAction {
  seq: number;
  kind: "new" | "compact";
}
export const atom_companionAction = atom<CompanionAction | null>(null);
export const atom_requestCompanionAction = atom(null, (get, set, kind: CompanionAction["kind"]) => {
  set(atom_companionAction, { seq: (get(atom_companionAction)?.seq ?? 0) + 1, kind });
  set(atom_companionOpen, true);
});


export type ProjectCheckUiStatus = "approval" | "running" | "completed" | "denied" | "unavailable" | "timed_out" | "cancelled" | "failed" | "nonzero_exit" | "disconnected";
export interface ProjectCheckUiState {
  toolCallId: string;
  checkId: ProjectCheckId;
  label: string;
  argv: string[];
  projectRoot: string;
  timeoutMs: number;
  status: ProjectCheckUiStatus;
  output: string;
  exitCode?: number | null;
  durationMs?: number;
  detail?: string;
}
// Local-process output is ephemeral; this atom is never persisted.
export const atom_projectCheckUiState = atom<ProjectCheckUiState | null>(null);
