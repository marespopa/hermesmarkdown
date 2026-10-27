// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { companionHandlers, createCompanionChat } from "./companion-chat-store";

vi.mock("@/app/services/ai", () => ({
  getAIConfig: () => ({ provider: "claude", apiKey: "claude-key", modelKey: "sonnet-5" }),
  isWebSearchEnabled: () => false,
}));

// One reply from /api/ai/companion as the route streams it: a UI message
// stream of server-sent events.
function streamed(chunks: object[]): Response {
  const body = [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), "data: [DONE]\n\n"].join("");
  return new Response(body, {
    headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
  });
}

const toolCallReply = (toolName: string, input: object) => streamed([
  { type: "start", messageId: "reply-1" },
  { type: "start-step" },
  { type: "tool-input-start", toolCallId: "call-1", toolName },
  { type: "tool-input-available", toolCallId: "call-1", toolName, input },
  { type: "finish-step" },
  { type: "finish" },
]);

const textReply = (text: string, before: object[] = []) => streamed([
  { type: "start", messageId: "reply-1" },
  { type: "start-step" },
  ...before,
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: text },
  { type: "text-end", id: "t1" },
  { type: "finish-step" },
  { type: "finish" },
]);

// Resolves once `check` passes (the loop runs on its own after sendMessage).
async function until(check: () => void, timeout = 2000) {
  const started = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (err) {
      if (Date.now() - started > timeout) throw err;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

type SentBody = { messages: { role: string; parts: { type: string; state?: string; output?: unknown }[] }[]; provider: string; webSearch: boolean };

describe("the companion's chat loop", () => {
  afterEach(() => {
    companionHandlers.runToolCall = async () => "The tools aren't ready yet. Try again.";
  });

  it("runs a streamed tool call in the browser and sends its result back for the answer", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(toolCallReply("edit_file", { path: "Roadmap.md", edits: [{ find: "Q3", replace: "Q4" }] }))
      .mockResolvedValueOnce(textReply("Moved the launch to Q4."));
    const runToolCall = vi.fn().mockResolvedValue("Saved Roadmap.md (1 edit).");
    companionHandlers.runToolCall = runToolCall;
    const chat = createCompanionChat({ fetch });

    await chat.sendMessage({ text: "Move the launch to Q4" });
    await until(() => expect(fetch).toHaveBeenCalledTimes(2));
    await until(() => expect(chat.status).toBe("ready"));

    const userId = chat.messages[0].id;
    expect(runToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ toolName: "edit_file", toolCallId: "call-1", input: { path: "Roadmap.md", edits: [{ find: "Q3", replace: "Q4" }] } }),
      userId,
    );
    const second = JSON.parse(fetch.mock.calls[1][1].body as string) as SentBody;
    expect(second.provider).toBe("claude");
    const toolPart = second.messages[1].parts.find((part) => part.type === "tool-edit_file");
    expect(toolPart).toMatchObject({ state: "output-available", output: "Saved Roadmap.md (1 edit)." });
    const reply = chat.messages[chat.messages.length - 1];
    expect(reply.parts.some((part) => part.type === "text" && part.text === "Moved the launch to Q4.")).toBe(true);
  });

  it("ends the turn after a web search the provider ran, without asking again", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(textReply("It shipped on 3 March.", [
      { type: "tool-input-available", toolCallId: "search-1", toolName: "web_search", input: { query: "launch date" }, providerExecuted: true },
      { type: "tool-output-available", toolCallId: "search-1", output: [{ url: "https://example.com/news" }], providerExecuted: true },
      { type: "source-url", sourceId: "s1", url: "https://example.com/news", title: "News" },
    ]));
    const runToolCall = vi.fn();
    companionHandlers.runToolCall = runToolCall;
    const chat = createCompanionChat({ fetch });

    await chat.sendMessage({ text: "When did it launch?" });
    await until(() => expect(chat.status).toBe("ready"));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(runToolCall).not.toHaveBeenCalled();
    const reply = chat.messages[chat.messages.length - 1];
    expect(reply.parts.some((part) => part.type === "source-url")).toBe(true);
  });
});
