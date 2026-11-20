import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTimeoutError, withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("gives the value of a promise that settles in time", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000, "step")).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes on a rejection", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000, "step")).rejects.toThrow("boom");
  });

  it("rejects with a TimeoutError naming the step when the promise never settles", async () => {
    const pending = withTimeout(new Promise<never>(() => {}), 1000, "Vault database");
    const result = expect(pending).rejects.toSatisfy(isTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await result;
    await expect(pending).rejects.toThrow("Vault database timed out after 1000ms");
  });
});
