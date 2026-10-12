// @vitest-environment node
import { describe, expect, it } from "vitest";
import { appendTodayLine, formatTodayLine } from "./today-append";

describe("formatTodayLine", () => {
  it("turns plain text into a list item", () => {
    expect(formatTodayLine("  deploy done ")).toBe("- deploy done");
  });

  it.each(["- ship", "* ship", "+ ship", "- [ ] call back", "- [x] call back", "1. ship", "2) ship"])(
    "keeps %j as typed",
    (text) => {
      expect(formatTodayLine(text)).toBe(text);
    },
  );

  it("treats a dash without a space as plain text", () => {
    expect(formatTodayLine("-text")).toBe("- -text");
  });

  it("returns null for whitespace-only text", () => {
    expect(formatTodayLine("   \n ")).toBeNull();
  });

  it("joins newlines into one line", () => {
    expect(formatTodayLine("first\r\n  second\nthird")).toBe("- first second third");
  });
});

describe("appendTodayLine", () => {
  it("writes just the line into empty or blank content", () => {
    expect(appendTodayLine("", "- a")).toBe("- a\n");
    expect(appendTodayLine("  \n", "- a")).toBe("- a\n");
  });

  it("adds the line after a trailing newline, keeping blank lines", () => {
    expect(appendTodayLine("# Friday\n\n", "- a")).toBe("# Friday\n\n- a\n");
    expect(appendTodayLine("- x\n", "- a")).toBe("- x\n- a\n");
  });

  it("starts a new line when the content doesn't end with one", () => {
    expect(appendTodayLine("notes", "- a")).toBe("notes\n- a\n");
  });

  it("follows CRLF files", () => {
    expect(appendTodayLine("# Day\r\nnotes", "- a")).toBe("# Day\r\nnotes\r\n- a\r\n");
    expect(appendTodayLine("# Day\r\n", "- a")).toBe("# Day\r\n- a\r\n");
  });
});
