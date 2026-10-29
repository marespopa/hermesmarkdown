import { describe, expect, it } from "vitest";
import { parseCompanionCommand, summaryMessage, summaryPrompt, transcriptText } from "./companion-commands";
import type { CompanionMessage } from "./companion-messages";

const thread: CompanionMessage[] = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "Tidy the roadmap" }, { type: "text", text: "--- CONTEXT ---\nsecret context\n--- END CONTEXT ---" }] },
  {
    id: "a1",
    role: "assistant",
    parts: [
      { type: "tool-read_file", toolCallId: "t1", state: "output-available", input: { path: "roadmap.md" }, output: "long file text" } as CompanionMessage["parts"][number],
      { type: "text", text: "Done: merged the two lists." },
    ],
  },
];

describe("parseCompanionCommand", () => {
  it("reads /new and /clear as a new chat", () => {
    expect(parseCompanionCommand("/new")).toEqual({ kind: "new" });
    expect(parseCompanionCommand("  /CLEAR ")).toEqual({ kind: "new" });
  });

  it("reads /compact and /summarize with what to keep", () => {
    expect(parseCompanionCommand("/compact")).toEqual({ kind: "compact", focus: "" });
    expect(parseCompanionCommand("/summarize keep the file paths")).toEqual({ kind: "compact", focus: "keep the file paths" });
  });

  it("reads /plan with its planning request", () => {
    expect(parseCompanionCommand("/plan add a calendar view")).toEqual({ kind: "plan", request: "add a calendar view" });
    expect(parseCompanionCommand(" /PLAN ")).toEqual({ kind: "plan", request: "" });
  });

  it("leaves other messages and longer words alone", () => {
    expect(parseCompanionCommand("/newsletter draft")).toBeNull();
    expect(parseCompanionCommand("start a /new list")).toBeNull();
    expect(parseCompanionCommand("/tasks")).toBeNull();
  });
});

describe("summaries", () => {
  it("sends what was typed, the replies and one line per tool call, never context or results", () => {
    const text = transcriptText(thread);
    expect(text).toContain("USER: Tidy the roadmap");
    expect(text).toContain("[read_file {\"path\":\"roadmap.md\"}]");
    expect(text).toContain("ASSISTANT:");
    expect(text).toContain("Done: merged the two lists.");
    expect(text).not.toContain("secret context");
    expect(text).not.toContain("long file text");
  });

  it("names what the summary should keep", () => {
    expect(summaryPrompt(thread, "the dates")).toContain("keep: the dates");
  });

  it("starts the new thread with the summary as a marked user turn", () => {
    const message = summaryMessage("  - Merged the lists  ");
    expect(message.role).toBe("user");
    expect(message.metadata).toEqual({ summary: true });
    expect(message.parts[0]).toEqual({ type: "text", text: "- Merged the lists" });
    expect(transcriptText([message])).toContain("EARLIER SUMMARY:\n- Merged the lists");
  });
});
