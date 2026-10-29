import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { checkFileOutput } from "./check-tools";

const deps = { load: load as (source: string) => unknown, linkExists: (name: string) => name === "Roadmap" };

describe("checkFileOutput", () => {
  it("reports broken JSON", async () => {
    const output = await checkFileOutput("data.json", '{\n  "a": 1,\n  "b": \n}', deps);

    expect(output).toContain("1 problem");
    expect(output).toMatch(/Unexpected|Expected/);
  });

  it("passes valid JSON and YAML, and reports bad YAML", async () => {
    expect(await checkFileOutput("a.json", '{"a":1}', deps)).toContain("no syntax problems");
    expect(await checkFileOutput("a.yml", "a: 1\nb: [x]", deps)).toContain("no syntax problems");
    expect(await checkFileOutput("a.yml", "a: [1\nb: 2", deps)).toContain("invalid YAML");
  });

  it("finds a syntax error in a code file and passes a good one", async () => {
    const bad = await checkFileOutput("src/a.ts", "const x = 1;\nfunction f( {\n  return 2;\n}\n", deps);
    const good = await checkFileOutput("src/b.ts", "export const x: number = 1;\n", deps);

    expect(bad).toMatch(/syntax error/);
    expect(good).toContain("no syntax problems");
  });

  it("checks a note's frontmatter, fences and links", async () => {
    const note = ["---", "title: a: b", "---", "See [[Roadmap]] and [[Missing]].", "", "```ts", "const x = 1;"].join("\n");

    const output = await checkFileOutput("n.md", note, deps);

    expect(output).toContain("Frontmatter isn't valid YAML");
    expect(output).toContain("never closed");
    expect(output).toContain("[[Missing]] doesn't match any file");
    expect(output).not.toContain("[[Roadmap]]");
  });

  it("ignores links inside code, and checks fenced code", async () => {
    const note = ["Use `[[Nope]]` here.", "", "```ts", "function f( {", "```", "", "```text", "[[Nope]]", "```"].join("\n");

    const output = await checkFileOutput("n.md", note, deps);

    expect(output).not.toContain("[[Nope]]");
    expect(output).toContain("in a ts code block");
  });

  it("says when there is no checker for a file type", async () => {
    expect(await checkFileOutput("run.sh", "echo hi", deps)).toContain("no syntax checker");
  });
});
