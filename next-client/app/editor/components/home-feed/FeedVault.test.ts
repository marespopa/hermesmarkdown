// @vitest-environment node
import { describe, expect, it } from "vitest";
import { vaultDisplayName } from "./FeedVault";

describe("vaultDisplayName", () => {
  it("uses a browser or GitHub vault's display name, else the folder name", () => {
    expect(vaultDisplayName({ kind: "browser", displayName: "Journal" } as any, "opfs-1")).toBe("Journal");
    expect(vaultDisplayName({ kind: "github", displayName: "acme/notes" } as any, "github-42-main")).toBe("acme/notes");
    expect(vaultDisplayName({ kind: "local" }, "Notes")).toBe("Notes");
    expect(vaultDisplayName(null, "Notes")).toBe("Notes");
  });
});
