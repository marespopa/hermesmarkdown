// @vitest-environment node
import { describe, expect, it } from "vitest";
import { appendJotLine, formatJotLine, jotTime } from "./quick-jot";

describe("formatJotLine", () => {
  it("turns plain text into a list item", () => {
    expect(formatJotLine("  deploy done ")).toBe("- deploy done");
  });

  it.each(["- ship", "* ship", "+ ship", "- [ ] call back", "- [x] call back", "1. ship", "2) ship"])(
    "keeps %j as typed",
    (text) => {
      expect(formatJotLine(text)).toBe(text);
    },
  );

  it("treats a dash without a space as plain text", () => {
    expect(formatJotLine("-text")).toBe("- -text");
  });

  it("returns null for whitespace-only text", () => {
    expect(formatJotLine("   \n ")).toBeNull();
  });

  it("joins newlines into one line", () => {
    expect(formatJotLine("first\r\n  second\nthird")).toBe("- first second third");
  });

  it("puts the time after the marker and checkbox", () => {
    const at = new Date(2026, 9, 10, 14, 20);
    expect(formatJotLine("deploy done", at)).toBe("- 14:20 deploy done");
    expect(formatJotLine("- [ ] x", at)).toBe("- [ ] 14:20 x");
    expect(formatJotLine("1. x", at)).toBe("1. 14:20 x");
  });
});

describe("appendJotLine", () => {
  it("writes just the line into empty or blank content", () => {
    expect(appendJotLine("", "- a")).toBe("- a\n");
    expect(appendJotLine("  \n", "- a")).toBe("- a\n");
  });

  it("adds the line after a trailing newline, keeping blank lines", () => {
    expect(appendJotLine("# Friday\n\n", "- a")).toBe("# Friday\n\n- a\n");
    expect(appendJotLine("- x\n", "- a")).toBe("- x\n- a\n");
  });

  it("starts a new line when the content doesn't end with one", () => {
    expect(appendJotLine("notes", "- a")).toBe("notes\n- a\n");
  });

  it("follows CRLF files", () => {
    expect(appendJotLine("# Day\r\nnotes", "- a")).toBe("# Day\r\nnotes\r\n- a\r\n");
    expect(appendJotLine("# Day\r\n", "- a")).toBe("# Day\r\n- a\r\n");
  });
});

describe("jotTime", () => {
  it("zero-pads hours and minutes", () => {
    expect(jotTime(new Date(2026, 9, 10, 7, 5))).toBe("07:05");
    expect(jotTime(new Date(2026, 9, 10, 23, 59))).toBe("23:59");
  });
});
