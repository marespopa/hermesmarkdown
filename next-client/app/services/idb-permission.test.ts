// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { queryPermission, requestPermissionFromUserGesture, requestPermissionFirst, verifyPermission } from "./idb";

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

  it("requests restoration access without awaiting a permission query", async () => {
    const handle = {
      queryPermission: vi.fn(async () => "prompt"),
      requestPermission: vi.fn(async () => "granted"),
    };

    await expect(requestPermissionFromUserGesture(handle as unknown as FileSystemHandle)).resolves.toBe(true);

    expect(handle.queryPermission).not.toHaveBeenCalled();
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
  });

  describe("requestPermissionFirst", () => {
    it("asks first, with no query ahead of it, and says whether it was granted", async () => {
      const handle = { queryPermission: vi.fn(async () => "prompt"), requestPermission: vi.fn(async () => "granted") };
      await expect(requestPermissionFirst(handle as unknown as FileSystemHandle)).resolves.toBe(true);
      expect(handle.queryPermission).not.toHaveBeenCalled();
      handle.requestPermission.mockResolvedValue("denied");
      await expect(requestPermissionFirst(handle as unknown as FileSystemHandle)).resolves.toBe(false);
    });

    it("checks for an earlier grant when the browser refuses to ask without a recent click", async () => {
      const refused = Object.assign(new Error("User activation is required"), { name: "SecurityError" });
      const handle = { queryPermission: vi.fn(async () => "granted"), requestPermission: vi.fn(async () => { throw refused; }) };
      await expect(requestPermissionFirst(handle as unknown as FileSystemHandle)).resolves.toBe(true);
      handle.queryPermission.mockResolvedValue("prompt");
      await expect(requestPermissionFirst(handle as unknown as FileSystemHandle)).resolves.toBe(false);
    });

    it("gives up on a check that never answers instead of holding the editor", async () => {
      vi.useFakeTimers();
      const handle = {
        queryPermission: vi.fn(() => new Promise(() => {})),
        requestPermission: vi.fn(async () => { throw new Error("no click"); }),
      };
      const result = requestPermissionFirst(handle as unknown as FileSystemHandle);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(result).resolves.toBe(false);
      vi.useRealTimers();
    });

    it("treats handles without a permission API as granted", async () => {
      await expect(requestPermissionFirst({ kind: "directory" } as unknown as FileSystemHandle)).resolves.toBe(true);
    });
  });
});
