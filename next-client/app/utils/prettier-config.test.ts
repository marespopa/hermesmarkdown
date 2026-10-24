// @vitest-environment node
import { describe, expect, it } from "vitest";
import { globToRegExp, optionsForFile, parsePrettierConfig, resolvePrettierConfig } from "./prettier-config";

type Tree = { [name: string]: string | Tree };

function fakeDir(tree: Tree): FileSystemDirectoryHandle {
  const missing = () => Object.assign(new Error("missing"), { name: "NotFoundError" });
  return {
    kind: "directory",
    getFileHandle: async (name: string) => {
      const entry = tree[name];
      if (typeof entry !== "string") throw missing();
      return { getFile: async () => ({ text: async () => entry }) };
    },
    getDirectoryHandle: async (name: string) => {
      const entry = tree[name];
      if (!entry || typeof entry === "string") throw missing();
      return fakeDir(entry);
    },
  } as unknown as FileSystemDirectoryHandle;
}

describe("parsePrettierConfig", () => {
  it("reads JSON, simple YAML and package.json's prettier key", () => {
    expect(parsePrettierConfig(".prettierrc", '{"semi": false}')).toEqual({ semi: false });
    expect(parsePrettierConfig(".prettierrc", "semi: false\ntabWidth: 4\nquoteProps: 'consistent' # note")).toEqual({ semi: false, tabWidth: 4, quoteProps: "consistent" });
    expect(parsePrettierConfig("package.json", '{"name":"app","prettier":{"singleQuote":true}}')).toEqual({ singleQuote: true });
    expect(parsePrettierConfig("package.json", '{"name":"app"}')).toBeNull();
  });
});

describe("optionsForFile", () => {
  it("keeps formatting options only and applies matching overrides", () => {
    const config = {
      semi: false,
      plugins: ["prettier-plugin-x"],
      overrides: [
        { files: "*.json", options: { tabWidth: 4 } },
        { files: ["src/**/*.{ts,tsx}"], excludeFiles: "src/legacy/**", options: { singleQuote: true } },
      ],
    };
    expect(optionsForFile(config, "data/a.json")).toEqual({ semi: false, tabWidth: 4 });
    expect(optionsForFile(config, "src/ui/App.tsx")).toEqual({ semi: false, singleQuote: true });
    expect(optionsForFile(config, "src/legacy/old.ts")).toEqual({ semi: false });
  });

  it("matches globs the way Prettier's files do", () => {
    expect(globToRegExp("*.md").test("docs/a.md")).toBe(true);
    expect(globToRegExp("src/*.ts").test("src/deep/a.ts")).toBe(false);
    expect(globToRegExp("**/*.ts").test("a.ts")).toBe(true);
    expect(globToRegExp("a,b.ts").test("a,b.ts")).toBe(true);
  });
});

describe("resolvePrettierConfig", () => {
  it("takes the nearest config, from the file's folder up to the vault", async () => {
    const vault = fakeDir({
      ".prettierrc": '{"semi": false}',
      web: { "package.json": '{"prettier":{"singleQuote":true}}', src: { "a.ts": "" } },
      api: { src: {} },
    });
    expect(await resolvePrettierConfig(vault, "web/src/a.ts")).toEqual({ options: { singleQuote: true } });
    expect(await resolvePrettierConfig(vault, "api/src/b.ts")).toEqual({ options: { semi: false } });
  });

  it("says so when the nearest config is a script it can't run", async () => {
    const vault = fakeDir({ ".prettierrc": '{"semi": false}', web: { "prettier.config.js": "export default {}" } });
    const result = await resolvePrettierConfig(vault, "web/a.ts");
    expect(result.options).toEqual({});
    expect(result.note).toMatch(/prettier\.config\.js can't be read/);
  });

  it("uses defaults with no vault or no config", async () => {
    expect(await resolvePrettierConfig(null, "a.ts")).toEqual({ options: {} });
    expect(await resolvePrettierConfig(fakeDir({}), "draft")).toEqual({ options: {} });
  });
});
