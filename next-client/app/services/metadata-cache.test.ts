import { afterEach, describe, expect, it } from "vitest";
import { clearMetadataCache, loadMetadataCache, saveMetadataCache } from "./metadata-cache";

// jsdom has no IndexedDB; the cache must degrade to "nothing cached" without throwing.
describe("metadata cache without IndexedDB", () => {
  const original = window.indexedDB;
  afterEach(() => {
    Object.defineProperty(window, "indexedDB", { configurable: true, value: original });
  });

  it("loads nothing and ignores writes", async () => {
    Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
    await expect(saveMetadataCache("local:Vault", {})).resolves.toBeUndefined();
    await expect(loadMetadataCache("local:Vault")).resolves.toBeNull();
    await expect(clearMetadataCache("local:Vault")).resolves.toBeUndefined();
  });

  it("treats a failing IndexedDB as an empty cache", async () => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open: () => {
          const request: any = {};
          queueMicrotask(() => { request.error = new Error("blocked"); request.onerror?.(); });
          return request;
        },
      },
    });
    await expect(loadMetadataCache("local:Vault")).resolves.toBeNull();
  });
});
