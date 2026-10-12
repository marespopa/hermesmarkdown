import { describe, expect, it } from "vitest";
import { CALLOUT_META } from "@/app/editor/constants/callouts";
import { ROLLUP_END, ROLLUP_START } from "@/app/utils/rollup/render";
import { parseSheetName } from "@/app/utils/sheet-nav";
import { TASK_STATUSES, TASK_STATUS_CHAR } from "@/app/utils/task-status";
import { extractTasks } from "@/app/utils/taskExtractor";
import { SYSTEM_PROMPT } from "@/app/editor/components/ai-chat/chat-helpers";
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

  it("names worklog sheets the app recognizes", () => {
    for (const name of ["2026-10-12.md", "2026-W42.md", "2026-10.md", "2026-Q4.md", "2026-year.md"]) {
      expect(HERMES_SYNTAX_GUIDE).toContain(name);
      expect(parseSheetName(name)).not.toBeNull();
    }
  });

  it("quotes the real rollup markers and callout types", () => {
    expect(HERMES_SYNTAX_GUIDE).toContain(ROLLUP_START);
    expect(HERMES_SYNTAX_GUIDE).toContain(ROLLUP_END);
    for (const type of Object.keys(CALLOUT_META)) expect(HERMES_SYNTAX_GUIDE).toContain(type);
  });

  it("is part of the AI Chat system prompt", () => {
    expect(SYSTEM_PROMPT).toContain(HERMES_SYNTAX_GUIDE);
    expect(SYSTEM_PROMPT).toContain(SYNTAX_PRESERVATION_RULE);
  });
});
