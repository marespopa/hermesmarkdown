import { describe, expect, it } from "vitest";
import { blobId } from "./git-hash";

describe("blobId", () => {
  it("hashes a blob like git", async () => {
    expect(await blobId(new TextEncoder().encode("hello\n"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });

  it("hashes the empty blob", async () => {
    expect(await blobId(new Uint8Array())).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  });
});
