// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  addRecentVault,
  MAX_RECENT_VAULTS,
  moveRecentVault,
  removeRecentVault,
  renameRecentBrowserVault,
  setRecentVaultIcon,
  setRecentVaultPinned,
  type RecentVault,
} from "./recent-vaults";

const local = (name: string, openedAt = 0): RecentVault => ({
  key: `local:${name}`,
  kind: "local",
  name,
  handle: { name } as FileSystemDirectoryHandle,
  openedAt,
});
const pinned = (name: string): RecentVault => ({ ...local(name), pinned: true });
const keys = (list: RecentVault[]) => list.map((entry) => entry.key);

describe("recent vaults", () => {
  it("moves a reopened vault to the top without duplicating it", () => {
    const list = [local("a"), local("b"), local("c")];
    expect(addRecentVault(list, local("c", 5)).map((entry) => entry.key)).toEqual(["local:c", "local:a", "local:b"]);
  });

  it("keeps at most the newest entries", () => {
    let list: RecentVault[] = [];
    for (let i = 0; i < MAX_RECENT_VAULTS + 3; i++) list = addRecentVault(list, local(`v${i}`));
    expect(list).toHaveLength(MAX_RECENT_VAULTS);
    expect(list[0].name).toBe(`v${MAX_RECENT_VAULTS + 2}`);
  });

  it("renames a browser vault's entry in place", () => {
    const descriptor = { version: 1 as const, kind: "browser" as const, id: "abc", displayName: "Notes", createdAt: 1 };
    const browser: RecentVault = { key: "browser:abc", kind: "browser", name: "Notes", descriptor, openedAt: 0 };
    const renamed = renameRecentBrowserVault([local("a"), browser], { ...descriptor, displayName: "Journal" });
    expect(renamed.map((entry) => entry.name)).toEqual(["a", "Journal"]);
    expect(renamed[1]).toMatchObject({ key: "browser:abc", descriptor: { displayName: "Journal" } });
  });

  it("removes an entry by key", () => {
    expect(removeRecentVault([local("a"), local("b")], "local:a").map((entry) => entry.name)).toEqual(["b"]);
  });

  it("keeps a pinned vault in its place when it's reopened", () => {
    const list = [pinned("a"), pinned("b"), local("c")];
    const next = addRecentVault(list, local("b", 9));
    expect(keys(next)).toEqual(["local:a", "local:b", "local:c"]);
    expect(next[1]).toMatchObject({ pinned: true, openedAt: 9 });
  });

  it("puts a newly opened vault first after the pinned ones", () => {
    expect(keys(addRecentVault([pinned("a"), local("b")], local("c")))).toEqual(["local:a", "local:c", "local:b"]);
  });

  it("never drops pinned vaults to make room", () => {
    let list: RecentVault[] = [pinned("p")];
    for (let i = 0; i < MAX_RECENT_VAULTS + 3; i++) list = addRecentVault(list, local(`v${i}`));
    expect(list).toHaveLength(MAX_RECENT_VAULTS + 1);
    expect(list[0].key).toBe("local:p");
  });

  it("pins to the end of the pinned group and unpins to the top of the rest", () => {
    const list = [pinned("a"), local("b"), local("c")];
    const pinnedC = setRecentVaultPinned(list, "local:c", true);
    expect(keys(pinnedC)).toEqual(["local:a", "local:c", "local:b"]);
    expect(pinnedC[1].pinned).toBe(true);
    const unpinnedA = setRecentVaultPinned(pinnedC, "local:a", false);
    expect(keys(unpinnedA)).toEqual(["local:c", "local:a", "local:b"]);
    expect(unpinnedA[1].pinned).toBeUndefined();
  });

  it("moves an entry within its own group only", () => {
    const list = [pinned("a"), pinned("b"), local("c"), local("d")];
    expect(keys(moveRecentVault(list, "local:d", 2))).toEqual(["local:a", "local:b", "local:d", "local:c"]);
    expect(keys(moveRecentVault(list, "local:d", 0))).toEqual(["local:a", "local:b", "local:d", "local:c"]);
    expect(keys(moveRecentVault(list, "local:a", 3))).toEqual(["local:b", "local:a", "local:c", "local:d"]);
  });

  it("keeps a vault's icon when it's reopened", () => {
    const list = [{ ...pinned("b"), icon: "🧪" }, { ...local("a"), icon: "📚" }];
    expect(addRecentVault(list, local("a", 3))[1].icon).toBe("📚");
    expect(addRecentVault(list, local("b", 3))[0].icon).toBe("🧪");
  });

  it("sets and clears an entry's icon", () => {
    const withIcon = setRecentVaultIcon([pinned("a"), local("b")], "local:a", "📚");
    expect(withIcon[0].icon).toBe("📚");
    expect(withIcon[1].icon).toBeUndefined();
    expect("icon" in setRecentVaultIcon(withIcon, "local:a", null)[0]).toBe(false);
  });
});
