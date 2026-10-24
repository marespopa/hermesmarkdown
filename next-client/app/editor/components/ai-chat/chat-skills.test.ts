import { describe, expect, it } from "vitest";
import {
  isSkillActive,
  parseTemplateBlocks,
  TASKS_SKILL,
  TEMPLATE_SKILL,
} from "./chat-skills";

describe("isSkillActive", () => {
  it("turns on for template / templates, or a /template message", () => {
    expect(isSkillActive(TEMPLATE_SKILL, ["make me an RFC template that asks for an owner"])).toBe(true);
    expect(isSkillActive(TEMPLATE_SKILL, ["hi", "Fix my Templates please"])).toBe(true);
    expect(isSkillActive(TEMPLATE_SKILL, ["/template meeting notes"])).toBe(true);
  });

  it("stays off otherwise", () => {
    expect(isSkillActive(TEMPLATE_SKILL, ["summarize this note", "templated text"])).toBe(false);
    expect(isSkillActive(TEMPLATE_SKILL, [])).toBe(false);
  });
});

describe("tasks skill", () => {

  it("turns tasks on for tasks, to-dos and action items, or /tasks", () => {
    for (const text of ["what tasks are due?", "make to-dos from this", "list the action items", "/Tasks"]) {
      expect(isSkillActive(TASKS_SKILL, [text])).toBe(true);
    }
    expect(isSkillActive(TASKS_SKILL, ["tighten this intro", "multitasking tips"])).toBe(false);
  });
});

describe("parseTemplateBlocks", () => {
  it("finds several blocks, keeping ``` code blocks inside a 4-tilde fence", () => {
    const reply = [
      "Here you go:",
      "~~~~hermes-template rfc.md",
      "# {{title}}",
      "```js",
      "code();",
      "```",
      "~~~~",
      "And another:",
      "~~~~hermes-template meeting",
      "Attendees: {{prompt:Who}}",
      "~~~~",
    ].join("\n");
    expect(parseTemplateBlocks(reply)).toEqual([
      { fileName: "rfc.md", content: "# {{title}}\n```js\ncode();\n```\n" },
      { fileName: "meeting.md", content: "Attendees: {{prompt:Who}}\n" },
    ]);
  });

  it("ignores ordinary code fences and unclosed blocks", () => {
    expect(parseTemplateBlocks("```md\n# x\n```")).toEqual([]);
    expect(parseTemplateBlocks("~~~~hermes-template a.md\nno end")).toEqual([]);
  });
});

describe("TEMPLATE_SKILL", () => {
  it("builds the built-in text from the syntax guide and block format", () => {
    expect(TEMPLATE_SKILL.builtin).toContain("{{prompt:Label}}");
    expect(TEMPLATE_SKILL.builtin).toContain("~~~~hermes-template rfc.md");
  });
});
