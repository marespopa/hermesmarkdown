import { describe, expect, it } from "vitest";
import {
  CHAT_SKILLS,
  CODE_SKILL,
  skillCommand,
  startsWithCommand,
  TASKS_SKILL,
  TEMPLATE_SKILL,
} from "./chat-skills";

describe("skill commands", () => {
  it("names a skill with or without its slash", () => {
    expect(skillCommand("tasks")).toBe("/tasks");
    expect(skillCommand(" /Tasks ")).toBe("/tasks");
    expect(skillCommand("/")).toBe("");
  });

  it("matches a message starting with the command as a word", () => {
    expect(startsWithCommand("  /Template meeting notes", TEMPLATE_SKILL.command)).toBe(true);
    expect(startsWithCommand("/tasks", TASKS_SKILL.command)).toBe(true);
    expect(startsWithCommand("/taskslist", TASKS_SKILL.command)).toBe(false);
    expect(startsWithCommand("what tasks are due?", TASKS_SKILL.command)).toBe(false);
  });

  it("describes every built-in skill for the prompt's list", () => {
    for (const skill of CHAT_SKILLS) expect(skill.description.length).toBeGreaterThan(10);
  });
});

describe("code skill", () => {
  it("edits code files with edit_file and note blocks with edit_code_block", () => {
    expect(CODE_SKILL.builtin).toContain("edit_file");
    expect(CODE_SKILL.builtin).toContain("edit_code_block");
    expect(CODE_SKILL.builtin).toContain("get_active_note");
  });
});

describe("TEMPLATE_SKILL", () => {
  it("builds the built-in text from the syntax guide, saving through create_template", () => {
    expect(TEMPLATE_SKILL.builtin).toContain("{{prompt:Label}}");
    expect(TEMPLATE_SKILL.builtin).toContain("create_template");
    expect(TEMPLATE_SKILL.builtin).not.toContain("hermes-template");
  });
});
