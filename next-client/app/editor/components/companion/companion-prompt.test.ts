import { describe, expect, it } from "vitest";
import { NOTE_CALC_GUIDE, TABLE_FORMULA_GUIDE } from "../../utils/formula-ai-guide";
import { buildCompanionSystemPrompt, COMPANION_PROMPT, PLANNING_NOTE, WEB_SEARCH_NOTE } from "./companion-prompt";

describe("buildCompanionSystemPrompt", () => {
  it("teaches table formulas and the inline calculator", () => {
    expect(COMPANION_PROMPT).toContain(TABLE_FORMULA_GUIDE);
    expect(COMPANION_PROMPT).toContain(NOTE_CALC_GUIDE);
  });

  it("is the base prompt with a vault and no skills", () => {
    expect(buildCompanionSystemPrompt({ hasVault: true })).toBe(COMPANION_PROMPT);
  });

  it("treats a requested file as an artifact to create before deep research", () => {
    expect(COMPANION_PROMPT).toContain("create or save a file is a deliverable");
    expect(COMPANION_PROMPT).toContain("Use create_plan for a new plan file");
    expect(COMPANION_PROMPT).toContain("report its exact path");
  });

  it("says when no vault is open", () => {
    expect(buildCompanionSystemPrompt({ hasVault: false })).toContain("No vault is open");
  });

  it("lists the skills load_skill can load, never their instructions", () => {
    const prompt = buildCompanionSystemPrompt({
      hasVault: true,
      skills: [{ command: "/tasks", description: "Work with open tasks." }, { command: "/standup" }],
    });
    expect(prompt).toBe(`${COMPANION_PROMPT}\n\nSkills you can load:\n- /tasks: Work with open tasks.\n- /standup (the user's own skill)`);
    expect(COMPANION_PROMPT).toContain("load_skill");
  });

  it("mentions web search only when it's on", () => {
    expect(buildCompanionSystemPrompt({ hasVault: true })).not.toContain("web_search");
    expect(buildCompanionSystemPrompt({ hasVault: true, webSearch: true })).toBe(`${COMPANION_PROMPT}\n${WEB_SEARCH_NOTE}`);
  });

  it("makes /plan turns planning-only and asks about saving", () => {
    const prompt = buildCompanionSystemPrompt({ hasVault: true, planning: true });
    expect(prompt).toContain(PLANNING_NOTE);
    expect(prompt).toContain("Do not change, create, move, rename or trash files");
    expect(prompt).toContain("whether the user wants it saved");
  });
});
