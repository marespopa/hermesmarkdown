import { describe, expect, it } from "vitest";
import { CALLOUT_META } from "@/app/editor/constants/callouts";
import { TASK_STATUSES, TASK_STATUS_CHAR } from "@/app/utils/task-status";
import { extractTasks } from "@/app/utils/taskExtractor";
import { COMPANION_PROMPT } from "@/app/editor/components/companion/companion-prompt";
import { HERMES_SYNTAX_GUIDE, SYNTAX_PRESERVATION_RULE } from "./hermes-syntax-guide";

describe("HermesMarkdown syntax guide", () => {
  it("lists every task status by its box character", () => {
    for (const status of TASK_STATUSES) {
      expect(HERMES_SYNTAX_GUIDE).toContain(`[${TASK_STATUS_CHAR[status]}]`);
      expect(SYNTAX_PRESERVATION_RULE).toContain(`[${TASK_STATUS_CHAR[status]}]`);
    }
  });

  it("gives a task example the extractor reads as written", () => {
    const example = HERMES_SYNTAX_GUIDE.match(/Example: (.*)/)![1];
    const [task] = extractTasks("2026-10-12.md", example);
    expect(task).toMatchObject({ status: "prog", dueDate: "2026-10-16", priority: "high", text: "Draft the release notes" });
    expect(task.tags).toContain("release");
  });

  it("gives dated notes no special meaning", () => {
    expect(HERMES_SYNTAX_GUIDE).not.toMatch(/sheet/i);
    expect(HERMES_SYNTAX_GUIDE).toContain("_templates");
  });

  it("lists the real callout types", () => {
    for (const type of Object.keys(CALLOUT_META)) expect(HERMES_SYNTAX_GUIDE).toContain(type);
  });

  it("is part of the AI companion's system prompt", () => {
    expect(COMPANION_PROMPT).toContain(HERMES_SYNTAX_GUIDE);
    expect(COMPANION_PROMPT).toContain(SYNTAX_PRESERVATION_RULE);
  });
});
