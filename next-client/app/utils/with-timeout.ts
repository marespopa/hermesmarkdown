// Startup awaits on browser storage (IndexedDB, OPFS, permission queries)
// can hang without ever settling, which used to leave the editor on its
// skeleton for good. Races a promise against a timer so every such await
// ends: it resolves or rejects as the promise does, or rejects with a
// TimeoutError naming `label` once `ms` pass.

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export const isTimeoutError = (err: unknown): err is TimeoutError =>
  (err as { name?: string } | null)?.name === "TimeoutError";

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
