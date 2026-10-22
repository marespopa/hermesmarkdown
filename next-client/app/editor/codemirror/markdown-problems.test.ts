import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { load } from "js-yaml";
import { frontmatterProblem, unclosedBlockProblems } from "./markdown-problems";

const stateOf = (doc: string) => EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] });

describe("frontmatterProblem", () => {
  it("passes valid frontmatter", () => {
    expect(frontmatterProblem("---\ntitle: Plan\ntags: [work, ideas]\n---\nBody", load)).toBeNull();
  });

  it("ignores a note without frontmatter", () => {
    expect(frontmatterProblem("# Heading\n\n---\n", load)).toBeNull();
  });

  it("names the document line of a YAML error", () => {
    const doc = "---\ntitle: Plan\nstatus: draft\n  bad: indent\n---\nBody";
    const problem = frontmatterProblem(doc, load);
    expect(problem?.line).toBe(4);
    expect(problem?.anchorLine).toBe(1);
    expect(problem?.message).toMatch(/^Frontmatter isn't valid YAML on line 4: /);
  });

  it("doesn't flag template fields that aren't filled in yet", () => {
    expect(frontmatterProblem("---\ncreated: {{date}}\ntitle: {{title}}\n---\n", load)).toBeNull();
  });
});

describe("unclosedBlockProblems", () => {
  it("finds nothing in closed blocks", () => {
    expect(unclosedBlockProblems(stateOf("Text\n\n```js\nconst a = 1;\n```\n\n$$\nx^2\n$$\n"))).toEqual([]);
  });

  it("flags a code fence that is never closed", () => {
    const problems = unclosedBlockProblems(stateOf("Intro\n\n```js\nconst a = 1;\n\nMore text"));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ line: 3, anchorLine: 3 });
    expect(problems[0].message).toMatch(/line 3 is never closed/);
  });

  it("flags a $$ block with no closing line", () => {
    const problems = unclosedBlockProblems(stateOf("Intro\n\n$$\nx^2\n\nText"));
    expect(problems).toEqual([expect.objectContaining({ line: 3, message: "The math block on line 3 is never closed." })]);
  });

  it("ignores $$ inside code", () => {
    expect(unclosedBlockProblems(stateOf("```\n$$\n```\n"))).toEqual([]);
  });
});
