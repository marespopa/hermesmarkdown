import { beforeEach, describe, expect, it, vi } from "vitest";

const idb = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("./idb", () => ({
  readKey: async (key: string) => idb.store.get(key),
  writeKey: async (key: string, value: unknown) => { idb.store.set(key, value); },
  deleteKeys: async (keys: string[]) => { keys.forEach((key) => idb.store.delete(key)); },
}));

import { forgetVaultWorkspace, loadVaultWorkspace, saveVaultWorkspace } from "./vault-workspace";

const snapshot = {
  layout: { version: 1, rootContainer: { id: "default-pane", openFilePaths: ["a.md"], activeFilePath: "a.md", isPinned: false } },
  openFiles: { "a.md": { content: "hi", lastSavedContent: "hi", fileName: "a.md", activeFilePath: null } },
  sidebarCollapsed: { Files: true },
} as never;

describe("vault workspace snapshots", () => {
  beforeEach(() => idb.store.clear());

  it("restores what was saved for a vault, and nothing for another", async () => {
    await saveVaultWorkspace("local:A", snapshot);
    expect(await loadVaultWorkspace("local:A")).toEqual(snapshot);
    expect(await loadVaultWorkspace("local:B")).toBeNull();
  });

  it("ignores a stored value that isn't a snapshot", async () => {
    idb.store.set("workspace:local:A", { nope: true });
    expect(await loadVaultWorkspace("local:A")).toBeNull();
  });

  it("forgets a vault's snapshot", async () => {
    await saveVaultWorkspace("local:A", snapshot);
    await forgetVaultWorkspace("local:A");
    expect(await loadVaultWorkspace("local:A")).toBeNull();
  });
});
