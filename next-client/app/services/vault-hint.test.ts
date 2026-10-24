// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readVaultHint, writeVaultHint } from "./vault-hint";

describe("vault hint", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("is unknown until a load writes it, then reads back", () => {
    expect(readVaultHint()).toBeNull();
    writeVaultHint("none");
    expect(readVaultHint()).toBe("none");
    writeVaultHint("saved");
    expect(readVaultHint()).toBe("saved");
  });

  it("reads as unknown when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readVaultHint()).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => writeVaultHint("none")).not.toThrow();
  });
});
