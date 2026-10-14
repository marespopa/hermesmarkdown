// Registry of pending-board-write flushers, so save paths can force a
// debounced scene into the content atom before they read it.
const flushers = new Map<string, () => void>();

/** Registers `flush` for `path`; returns the unregister function. */
export function registerBoardFlush(path: string, flush: () => void): () => void {
  flushers.set(path, flush);
  return () => {
    if (flushers.get(path) === flush) flushers.delete(path);
  };
}

export function flushBoardWrite(path: string): void {
  flushers.get(path)?.();
}

export function flushAllBoardWrites(): void {
  for (const flush of [...flushers.values()]) flush();
}
