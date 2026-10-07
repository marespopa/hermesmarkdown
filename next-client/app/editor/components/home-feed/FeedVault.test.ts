// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { atom_vaultDescriptor, atom_vaultHandle, atom_vaultName } from "@/app/atoms/vault-atoms";
import { vaultDisplayName } from "./FeedVault";

describe("vaultDisplayName", () => {
  it("uses a browser or GitHub vault's display name, else the folder name", () => {
    expect(vaultDisplayName({ kind: "browser", displayName: "Journal" } as any, "opfs-1")).toBe("Journal");
    expect(vaultDisplayName({ kind: "github", displayName: "acme/notes" } as any, "github-42-main")).toBe("acme/notes");
    expect(vaultDisplayName({ kind: "local" }, "Notes")).toBe("Notes");
    expect(vaultDisplayName(null, "Notes")).toBe("Notes");
  });
});

describe("atom_vaultName", () => {
  it("names a browser vault by its display name, not its storage folder", () => {
    const store = createStore();
    expect(store.get(atom_vaultName)).toBeNull();
    store.set(atom_vaultHandle, { name: "browser-3f2a" } as FileSystemDirectoryHandle);
    expect(store.get(atom_vaultName)).toBe("browser-3f2a");
    store.set(atom_vaultDescriptor, { version: 1, kind: "browser", id: "3f2a", displayName: "Journal", createdAt: 1 });
    expect(store.get(atom_vaultName)).toBe("Journal");
  });
});
