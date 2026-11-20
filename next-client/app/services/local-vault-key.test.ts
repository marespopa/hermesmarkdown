import { describe, expect, it } from "vitest";
import { resolveLocalVaultKey } from "./local-vault-key";
import type { RecentVault } from "./recent-vaults";

const folder = (name: string, id: string) => ({
  name,
  id,
  isSameEntry: async (other: { id: string }) => other.id === id,
}) as unknown as FileSystemDirectoryHandle;
const entry = (key: string, handle: FileSystemDirectoryHandle): RecentVault =>
  ({ key, kind: "local", name: handle.name, handle, openedAt: 0 });

describe("resolveLocalVaultKey", () => {
  it("is local:<name> for a folder not seen before", async () => {
    expect(await resolveLocalVaultKey(folder("notes", "a"), [entry("local:work", folder("work", "w"))])).toBe("local:notes");
  });

  it("keeps the key a known folder already has", async () => {
    const notes = folder("notes", "a");
    expect(await resolveLocalVaultKey(folder("notes", "a"), [entry("local:notes", notes)])).toBe("local:notes");
  });

  it("separates a second folder with the same name", async () => {
    const first = entry("local:notes", folder("notes", "a"));
    expect(await resolveLocalVaultKey(folder("notes", "b"), [first])).toBe("local:notes~2");
    const second = entry("local:notes~2", folder("notes", "b"));
    expect(await resolveLocalVaultKey(folder("notes", "c"), [first, second])).toBe("local:notes~3");
    expect(await resolveLocalVaultKey(folder("notes", "b"), [first, second])).toBe("local:notes~2");
  });
});
