// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { queryPermission, verifyPermission } from "./idb";

describe("vault permission helpers", () => {
  it("treat handles without a permission API (Safari, Firefox, browser storage) as granted", async () => {
    const handle = { kind: "directory", name: "vault" } as unknown as FileSystemHandle;
    await expect(queryPermission(handle)).resolves.toBe(true);
    await expect(verifyPermission(handle)).resolves.toBe(true);
  });

  it("still query and request permission on Chromium disk handles", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "prompt"),
      requestPermission: vi.fn(async () => "granted"),
    };
    await expect(queryPermission(handle as unknown as FileSystemHandle)).resolves.toBe(false);
    await expect(verifyPermission(handle as unknown as FileSystemHandle)).resolves.toBe(true);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
  });

  it("report denial when there is no way to request permission", async () => {
    const handle = { queryPermission: vi.fn(async () => "prompt") };
    await expect(verifyPermission(handle as unknown as FileSystemHandle)).resolves.toBe(false);
  });
});
