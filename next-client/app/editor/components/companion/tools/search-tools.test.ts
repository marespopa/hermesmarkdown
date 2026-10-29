import { describe, expect, it } from "vitest";
import { globMatcher } from "./search-tools";

describe("globMatcher", () => {
  it("matches a pattern without a slash against the file name, in any folder", () => {
    const test = globMatcher("*.test.ts");

    expect(test("src/a.test.ts")).toBe(true);
    expect(test("a.test.tsx")).toBe(false);
  });

  it("keeps * inside a folder and lets ** cross folders", () => {
    expect(globMatcher("src/*.ts")("src/deep/a.ts")).toBe(false);
    expect(globMatcher("src/**/*.ts")("src/deep/er/a.ts")).toBe(true);
    expect(globMatcher("src/**/*.ts")("src/a.ts")).toBe(true);
    expect(globMatcher("src/**/*.ts")("lib/a.ts")).toBe(false);
  });

  it("treats dots and other characters literally, ignoring case", () => {
    expect(globMatcher("README.md")("docs/readme.md")).toBe(true);
    expect(globMatcher("a.b")("axb")).toBe(false);
    expect(globMatcher("v?.ts")("v1.ts")).toBe(true);
  });
});
