import { describe, expect, it } from "vitest";
import { formatDateToken, parseDateToken } from "./date-format";

describe("date formatting", () => {
  it("formats dates using the @YYYY-MM-DD token", () => {
    expect(formatDateToken(new Date(2026, 7, 27))).toBe("@2026-08-27");
  });

  it("parses both plain and prefixed ISO dates", () => {
    const fromPlain = parseDateToken("2026-08-27");
    const fromPrefixed = parseDateToken("@2026-08-27");

    expect(fromPlain?.getFullYear()).toBe(2026);
    expect(fromPlain?.getMonth()).toBe(7);
    expect(fromPlain?.getDate()).toBe(27);
    expect(fromPrefixed?.getFullYear()).toBe(2026);
    expect(fromPrefixed?.getMonth()).toBe(7);
    expect(fromPrefixed?.getDate()).toBe(27);
  });
});
