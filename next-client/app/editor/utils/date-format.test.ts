import { describe, expect, it } from "vitest";
import { formatDateToken, parseDateToken } from "./date-format";

describe("date formatting", () => {
  it("formats dates using the @due(YYYY-MM-DD) token", () => {
    expect(formatDateToken(new Date(2026, 7, 27), "due")).toBe("@due(2026-08-27)");
  });

  it("parses both plain ISO and @due(...) dates", () => {
    const fromPlain = parseDateToken("2026-08-27");
    const fromDue = parseDateToken("@due(2026-08-27)");

    expect(fromPlain?.getFullYear()).toBe(2026);
    expect(fromPlain?.getMonth()).toBe(7);
    expect(fromPlain?.getDate()).toBe(27);
    expect(fromDue?.getFullYear()).toBe(2026);
    expect(fromDue?.getMonth()).toBe(7);
    expect(fromDue?.getDate()).toBe(27);
  });
});
