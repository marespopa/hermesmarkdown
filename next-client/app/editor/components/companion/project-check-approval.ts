import { type createStore } from "jotai";

type Store = ReturnType<typeof createStore>;
import { atom_projectCheckUiState, type ProjectCheckUiState } from "@/app/atoms/companion-atoms";

let resolvePending: ((approved: boolean) => void) | null = null;

export function requestProjectCheckApproval(store: Store, state: ProjectCheckUiState): Promise<boolean> {
  if (resolvePending) return Promise.resolve(false);
  return new Promise((resolve) => {
    resolvePending = resolve;
    store.set(atom_projectCheckUiState, state);
  });
}

export function answerProjectCheckApproval(store: Store, approved: boolean) {
  if (!resolvePending) return;
  const current = store.get(atom_projectCheckUiState);
  if (current) store.set(atom_projectCheckUiState, { ...current, status: approved ? "running" : "denied", detail: approved ? undefined : "You denied this invocation." });
  const resolve = resolvePending;
  resolvePending = null;
  resolve(approved);
}

export function cancelPendingProjectCheckApproval(store: Store) {
  if (!resolvePending) return;
  const current = store.get(atom_projectCheckUiState);
  if (current) store.set(atom_projectCheckUiState, { ...current, status: "cancelled", detail: "The request was cancelled." });
  const resolve = resolvePending;
  resolvePending = null;
  resolve(false);
}
