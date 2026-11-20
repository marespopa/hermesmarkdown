import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An IndexedDB whose open never answers, as a thawed background tab can give.
function hangingIndexedDb() {
  return { open: vi.fn(() => ({}) as IDBOpenDBRequest) };
}

describe("open notes database", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("gives up reading when the browser never opens the database, after one retry", async () => {
    const idb = hangingIndexedDb();
    vi.stubGlobal("indexedDB", idb);
    const { indexedDbBackend } = await import("./open-notes-db");

    const loading = indexedDbBackend.load();
    const result = expect(loading).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(4000);
    await result;
    expect(idb.open).toHaveBeenCalledTimes(2);
  });
});
