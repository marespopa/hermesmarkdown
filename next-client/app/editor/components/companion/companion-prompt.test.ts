import { describe, expect, it } from "vitest";
import { NOTE_CALC_GUIDE, TABLE_FORMULA_GUIDE } from "../../utils/formula-ai-guide";
import { buildCompanionSystemPrompt, COMPANION_PROMPT, WEB_SEARCH_NOTE } from "./companion-prompt";

describe("buildCompanionSystemPrompt", () => {
  it("teaches table formulas and the inline calculator", () => {
    expect(COMPANION_PROMPT).toContain(TABLE_FORMULA_GUIDE);
    expect(COMPANION_PROMPT).toContain(NOTE_CALC_GUIDE);
  });

  it("is the base prompt with a vault", () => {
    expect(buildCompanionSystemPrompt({ hasVault: true })).toBe(COMPANION_PROMPT);
  });

  it("treats a requested file as a proposal the user applies", () => {
    expect(COMPANION_PROMPT).toContain("create or save a file is a deliverable");
    expect(COMPANION_PROMPT).toContain("Nothing is written until the user reviews the proposal");
  });

  it("says when no vault is open", () => {
    expect(buildCompanionSystemPrompt({ hasVault: false })).toContain("No vault is open");
  });

  it("mentions web search only when it's on", () => {
    expect(buildCompanionSystemPrompt({ hasVault: true })).not.toContain("web_search");
    expect(buildCompanionSystemPrompt({ hasVault: true, webSearch: true })).toBe(`${COMPANION_PROMPT}\n${WEB_SEARCH_NOTE}`);
  });
});
