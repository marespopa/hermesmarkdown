// @vitest-environment node
import { describe, expect, it } from "vitest";
import { canFormat, formatCode, formatLanguageOf } from "./format-code";

describe("formatLanguageOf", () => {
  it("reads a file's extension and a fence's first word", () => {
    expect(formatLanguageOf("src/App.TSX", true)).toBe("tsx");
    expect(formatLanguageOf("Dockerfile", true)).toBe("");
    expect(formatLanguageOf("ts title=example", false)).toBe("ts");
    expect(formatLanguageOf("JSON{.numberLines}", false)).toBe("json");
  });
});

describe("formatCode", () => {
  it("formats the languages it knows", async () => {
    expect(await formatCode("const a={b:1}", "ts")).toBe("const a = { b: 1 };\n");
    expect(await formatCode('{"a":1,"b":[1,2]}', "json")).toBe('{ "a": 1, "b": [1, 2] }\n');
    expect(await formatCode("a{color:red}", "css")).toBe("a {\n  color: red;\n}\n");
  });

  it("returns null for a language with no formatter", async () => {
    expect(canFormat("py")).toBe(false);
    expect(await formatCode("x=1", "py")).toBeNull();
  });

  it("throws on code that doesn't parse", async () => {
    await expect(formatCode("const = ;", "js")).rejects.toThrow();
  });
});
