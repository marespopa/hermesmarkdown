import { atom, type createStore } from "jotai";

type Store = ReturnType<typeof createStore>;

// The companion's trash tool asks first: its call waits here until the user
// answers the TrashConfirmCard shown in its place in the thread (by the
// call's toolCallId). Stopping the turn or starting a new chat keeps the
// files (declineAllTrash).

// The paths each waiting trash call would move, by toolCallId.
export const atom_trashRequests = atom<Record<string, string[]>>({});

const waiting = new Map<string, (trash: boolean) => void>();

// Resolves true when the user says Move to Trash, false when they keep the files.
export function askToTrash(store: Store, toolCallId: string, paths: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    waiting.get(toolCallId)?.(false);
    waiting.set(toolCallId, resolve);
    store.set(atom_trashRequests, (prev) => ({ ...prev, [toolCallId]: paths }));
  });
}

export function answerTrash(store: Store, toolCallId: string, trash: boolean): void {
  const resolve = waiting.get(toolCallId);
  waiting.delete(toolCallId);
  store.set(atom_trashRequests, (prev) => {
    const next = { ...prev };
    delete next[toolCallId];
    return next;
  });
  resolve?.(trash);
}

export function declineAllTrash(store: Store): void {
  for (const toolCallId of [...waiting.keys()]) answerTrash(store, toolCallId, false);
}
