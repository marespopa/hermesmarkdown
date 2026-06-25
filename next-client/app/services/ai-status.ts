import { getDefaultStore } from "jotai";
import toast from "react-hot-toast";
import { atom_aiActionStatus } from "@/app/atoms/ui-atoms";

// Lets app/services/ai.ts — a plain async module, not a React hook — report
// AI action progress. There is no persistent status surface, so completion
// and failure are reported as one-shot transient toasts; "thinking" is not
// toasted — only start (atom only, used by AI-aware UI like the toolbar) and
// finish (toast).

let seqCounter = 0;

export function beginAiAction(label: string): number {
  const seq = ++seqCounter;
  getDefaultStore().set(atom_aiActionStatus, { seq, status: "thinking", label });
  return seq;
}

export function finishAiActionSuccess(seq: number, label: string): void {
  getDefaultStore().set(atom_aiActionStatus, { seq, status: "idle" });
  toast.success(label, { id: "ai-action" });
}

export function finishAiActionError(seq: number, message: string): void {
  getDefaultStore().set(atom_aiActionStatus, { seq, status: "idle" });
  toast.error(message, { id: "ai-action" });
}

// Kept for call sites that acknowledge an in-flight action explicitly; with
// no ambient pill left to dismiss, this is just a status reset.
export function dismissAiActionStatus(seq: number): void {
  const store = getDefaultStore();
  if (store.get(atom_aiActionStatus).seq === seq) {
    store.set(atom_aiActionStatus, { seq, status: "idle" });
  }
}
