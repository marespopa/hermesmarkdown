import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAllChangesCaches, loadChangesCache, saveChangesCache } from "./changes-cache";

// jsdom has no IndexedDB; the cache must degrade to "nothing saved" without throwing.
describe("Changes cache without IndexedDB", () => {
  const original = window.indexedDB;
  afterEach(() => {
    Object.defineProperty(window, "indexedDB", { configurable: true, value: original });
  });

  it("loads nothing and ignores writes", async () => {
    Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
    await expect(saveChangesCache("local:Vault", { status: "no-repo" })).resolves.toBeUndefined();
    await expect(loadChangesCache("local:Vault")).resolves.toBeNull();
    await expect(clearAllChangesCaches()).resolves.toBeUndefined();
  });

  it("treats a failing IndexedDB as nothing saved", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open: () => {
          const request: { error?: Error; onerror?: () => void } = {};
          queueMicrotask(() => {
            request.error = new Error("blocked");
            request.onerror?.();
          });
          return request;
        },
      },
    });
    await expect(loadChangesCache("local:Vault")).resolves.toBeNull();
  });
});
