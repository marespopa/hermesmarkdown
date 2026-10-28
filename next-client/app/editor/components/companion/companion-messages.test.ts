import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { foldDoneTools, forModel, FULL_TURNS, LEFT_OUT, userTurn } from "./companion-messages";

const noContext = { path: null, selection: "", vaultRefs: [], attachments: [] };
const long = "x".repeat(3_000);

const user = (id: string, ...texts: string[]): UIMessage => ({
  id, role: "user", parts: texts.map((text) => ({ type: "text" as const, text })),
});
const reply = (id: string, output: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [
    { type: "step-start" },
    { type: "tool-read_file", toolCallId: `${id}-call`, state: "output-available", input: { path: "Roadmap.md" }, output },
    { type: "text", text: "Done." },
  ] as UIMessage["parts"],
});

// A thread of `turns` user messages, each with a long context part and a
// reply that read a long file.
const thread = (turns: number) =>
  Array.from({ length: turns }, (_, i) => [user(`u${i}`, `question ${i}`, long), reply(`a${i}`, long)]).flat();

describe("userTurn", () => {
  it("carries a /command's skill in the context, labelled with its command", () => {
    const turn = userTurn("/tasks what's next?", noContext, { command: "/tasks", text: "Skill: work with tasks." });

    expect(turn.parts[0]).toEqual({ type: "text", text: "/tasks what's next?" });
    expect(turn.parts[1]).toEqual({
      type: "text",
      text: "--- CONTEXT ---\n--- SKILL /tasks ---\nSkill: work with tasks.\n--- END SKILL ---\n--- END CONTEXT ---",
    });
    expect(turn.metadata).toEqual({ context: ["/tasks"] });
  });

  it("records the model Auto chose on the turn", () => {
    const auto = { model: "haiku-4-5", name: "Claude 4.5 Haiku", tier: "fast" as const };
    expect(userTurn("hi", noContext, undefined, auto).metadata).toEqual({ auto });
    expect(userTurn("hi", noContext).metadata).toBeUndefined();
  });

  it("sends no skill block without one", () => {
    expect(userTurn("hello", noContext).parts).toEqual([{ type: "text", text: "hello" }]);
  });
});

describe("forModel", () => {
  it("sends a short thread as it is", () => {
    const messages = thread(FULL_TURNS);
    expect(forModel(messages)).toBe(messages);
  });

  it("keeps the newest turns whole and leaves long parts out of older ones", () => {
    const messages = thread(FULL_TURNS + 2);
    const sent = forModel(messages);

    expect(sent.slice(4)).toEqual(messages.slice(4));
    const [oldUser, oldReply] = sent;
    expect(oldUser.parts).toEqual([{ type: "text", text: "question 0" }, { type: "text", text: LEFT_OUT }]);
    expect(oldReply.parts[1]).toMatchObject({ type: "tool-read_file", output: LEFT_OUT });
    expect(oldReply.parts[2]).toEqual({ type: "text", text: "Done." });
    // The thread itself is untouched.
    expect(messages[0].parts[1]).toEqual({ type: "text", text: long });
  });

  it("drops older turns' images and keeps short results", () => {
    const old: UIMessage = {
      id: "u0",
      role: "user",
      parts: [{ type: "text", text: "look" }, { type: "file", mediaType: "image/png", url: "data:image/png;base64,AAAA" }],
    };
    const messages = [old, reply("a0", "short"), ...thread(FULL_TURNS)];
    const sent = forModel(messages);

    expect(sent[0].parts).toEqual([{ type: "text", text: "look" }]);
    expect(sent[1]).toEqual(messages[1]);
  });
});

describe("foldDoneTools", () => {
  const tool = (id: string, state: string) => ({ type: "tool-read_file", toolCallId: id, state, input: {} }) as unknown as UIMessage["parts"][number];
  const text = { type: "text" as const, text: "hi" };

  it("folds a run of finished calls into one item", () => {
    const items = foldDoneTools([tool("a", "output-available"), tool("b", "output-available"), text]);
    expect(items).toHaveLength(2);
    expect("done" in items[0] && items[0].done.map((v) => v.toolCallId)).toEqual(["a", "b"]);
  });

  it("keeps running and failed calls on their own and splits runs around them", () => {
    const items = foldDoneTools([tool("a", "output-available"), tool("b", "input-available"), tool("c", "output-error"), tool("d", "output-available")]);
    expect(items.map((item) => ("done" in item ? "done" : "part"))).toEqual(["done", "part", "part", "done"]);
  });
});
