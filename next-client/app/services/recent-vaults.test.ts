// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addRecentVault, MAX_RECENT_VAULTS, removeRecentVault, type RecentVault } from "./recent-vaults";

const local = (name: string, openedAt = 0): RecentVault => ({
  key: `local:${name}`,
  kind: "local",
  name,
  handle: { name } as FileSystemDirectoryHandle,
  openedAt,
});

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

  it("removes an entry by key", () => {
    expect(removeRecentVault([local("a"), local("b")], "local:a").map((entry) => entry.name)).toEqual(["b"]);
  });
});
