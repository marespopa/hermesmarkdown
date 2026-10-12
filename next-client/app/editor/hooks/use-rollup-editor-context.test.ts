import { describe, expect, it } from "vitest";
import { rollupCaption } from "./use-rollup-editor-context";

describe("rollupCaption", () => {
  const at = new Date(2026, 9, 12, 14, 5).getTime();

  it("says how long ago the generated part was rebuilt", () => {
    expect(rollupCaption(undefined, at)).toBe("From your daily sheets");
    expect(rollupCaption(at, at + 30_000)).toBe("From your daily sheets · updated just now");
    expect(rollupCaption(at, at + 5 * 60_000 + 10_000)).toBe("From your daily sheets · updated 5 min ago");
    expect(rollupCaption(at, at + 2 * 60 * 60_000)).toMatch(/^From your daily sheets · updated at \d/);
  });
});
