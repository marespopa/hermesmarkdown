import type { useStore } from "jotai";
import { atom_clearBusy, atom_markBusy, type BusyPath } from "@/app/atoms/busy-path-atoms";

type Store = ReturnType<typeof useStore>;

// Runs `fn` with `entries` marked busy (atom_busyPaths), clearing them when
// it settles, whether it succeeded or not.
export async function withBusyPaths<T>(store: Store, entries: [string, BusyPath][], fn: () => Promise<T>): Promise<T> {
  const marked = entries.filter(([path]) => !!path);
  if (marked.length === 0) return fn();
  store.set(atom_markBusy, marked);
  try {
    return await fn();
  } finally {
    store.set(atom_clearBusy, marked.map(([path]) => path));
  }
}
