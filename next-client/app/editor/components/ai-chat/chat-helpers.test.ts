import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/Toastr", () => ({ showErrorToast: vi.fn() }));

import { NOTE_CALC_GUIDE, TABLE_FORMULA_GUIDE } from "../../utils/formula-ai-guide";
import { ACTIVE_FILE_CHAR_LIMIT, buildChatSystemPrompt, SYSTEM_PROMPT } from "./chat-helpers";

describe("SYSTEM_PROMPT", () => {
  it("teaches table formulas and the inline calculator", () => {
    expect(SYSTEM_PROMPT).toContain(TABLE_FORMULA_GUIDE);
    expect(SYSTEM_PROMPT).toContain(NOTE_CALC_GUIDE);
  });
});

describe("buildChatSystemPrompt", () => {
  it("includes the active file name, path and content", () => {
    const prompt = buildChatSystemPrompt("# Budget\nRent 4000 RON", "", "notes/budget.md");
    expect(prompt.startsWith(SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain("ACTIVE FILE: budget.md (notes/budget.md)");
    expect(prompt).toContain("Rent 4000 RON");
  });

  it("keeps the active file alongside the selection", () => {
    const prompt = buildChatSystemPrompt("Intro\nBody paragraph", "Body paragraph", "a.md");
    expect(prompt).toContain("ACTIVE FILE: a.md");
    expect(prompt).toContain("Intro");
    expect(prompt).toContain("SELECTED TEXT (target for edits) ---\nBody paragraph");
  });

  it("labels an unsaved document as Untitled", () => {
    expect(buildChatSystemPrompt("draft", "")).toContain("ACTIVE FILE: Untitled —");
  });

  it("truncates very long documents", () => {
    const prompt = buildChatSystemPrompt("x".repeat(ACTIVE_FILE_CHAR_LIMIT + 50), "", "long.md");
    expect(prompt).toContain("[document continues…]");
    expect(prompt).not.toContain("x".repeat(ACTIVE_FILE_CHAR_LIMIT + 1));
  });

  it("omits the file block for an empty document", () => {
    expect(buildChatSystemPrompt("   ", "", "empty.md")).toBe(SYSTEM_PROMPT);
  });
});
