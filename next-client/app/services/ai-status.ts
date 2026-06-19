import { getDefaultStore } from "jotai/vanilla";
import { atom_aiActionStatus } from "@/app/atoms/ui-atoms";

// Lets app/services/ai.ts — a plain async module, not a React hook — report
// AI action progress to the status bar's pill. One global pill for the whole
// app (per the status-bar-redesign spec: last action wins, no per-pane state).

let seqCounter = 0;
const DONE_DISPLAY_MS = 2000;

export function beginAiAction(label: string): number {
  const seq = ++seqCounter;
  getDefaultStore().set(atom_aiActionStatus, { seq, status: "thinking", label });
  return seq;
}

export function finishAiActionSuccess(seq: number, label: string): void {
  const store = getDefaultStore();
  store.set(atom_aiActionStatus, { seq, status: "done", label });
  setTimeout(() => {
    if (store.get(atom_aiActionStatus).seq === seq) {
      store.set(atom_aiActionStatus, { seq, status: "idle" });
    }
  }, DONE_DISPLAY_MS);
}

export function finishAiActionError(seq: number, message: string): void {
  getDefaultStore().set(atom_aiActionStatus, { seq, status: "error", message });
}

// Error pills wait for acknowledgment rather than auto-clearing — call this
// when the user clicks the error pill.
export function dismissAiActionStatus(seq: number): void {
  const store = getDefaultStore();
  if (store.get(atom_aiActionStatus).seq === seq) {
    store.set(atom_aiActionStatus, { seq, status: "idle" });
  }
}
