import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { forModel, FULL_TURNS, KEEP_ROUNDS, LEFT_OUT, replyItems, stalledOnIntent, TRIM_BLOCK, userTurn } from "./companion-messages";

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
  it("records the model Auto chose on the turn", () => {
    const auto = { model: "haiku-4-5", name: "Claude 4.5 Haiku", tier: "fast" as const };
    expect(userTurn("hi", noContext, auto).metadata).toEqual({ auto });
    expect(userTurn("hi", noContext).metadata).toBeUndefined();
  });

  it("sends only the text when there is no context", () => {
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

describe("forModel in a long turn", () => {
  const round = (n: number): UIMessage["parts"] => [
    { type: "step-start" },
    { type: "tool-read_file", toolCallId: `r${n}`, state: "output-available", input: { path: "a" }, output: long },
    { type: "tool-create_file", toolCallId: `w${n}`, state: "output-available", input: { path: "a", content: long }, output: "Saved." },
  ] as unknown as UIMessage["parts"];
  const turn = (rounds: number): UIMessage[] => [
    user("u1", "do the plan"),
    { id: "a1", role: "assistant", parts: Array.from({ length: rounds }, (_, n) => round(n)).flat() },
  ];

  it("sends a turn of few rounds whole", () => {
    const messages = turn(KEEP_ROUNDS + TRIM_BLOCK - 1);
    expect(forModel(messages)).toBe(messages);
  });

  it("leaves out the old rounds' long results and written text, a block at a time", () => {
    const messages = turn(KEEP_ROUNDS + TRIM_BLOCK);
    const sent = forModel(messages)[1].parts as unknown as { toolCallId?: string; output?: string; input?: { content?: string } }[];

    const firstRead = sent.find((part) => part.toolCallId === "r0")!;
    const firstWrite = sent.find((part) => part.toolCallId === "w0")!;
    expect(firstRead.output).toBe(LEFT_OUT);
    expect(firstWrite.input?.content).toBe(LEFT_OUT);
    const newest = sent.find((part) => part.toolCallId === `r${KEEP_ROUNDS + TRIM_BLOCK - 1}`)!;
    expect(newest.output).toBe(long);
    // The saved thread is untouched.
    expect((messages[1].parts[1] as unknown as { output: string }).output).toBe(long);
  });
});

describe("replyItems", () => {
  const tool = (id: string, state: string, name = "read_file", input: unknown = {}) => ({ type: `tool-${name}`, toolCallId: id, state, input }) as unknown as UIMessage["parts"][number];
  const text = { type: "text" as const, text: "Adding the types." };

  it("keeps text, hides finished and failed calls, keeps running ones", () => {
    const { items, hidden } = replyItems([text, tool("a", "output-available"), tool("b", "output-error"), tool("c", "input-available")]);

    expect(items.map((item) => ("tool" in item ? "tool" : "text"))).toEqual(["text", "tool"]);
    expect(hidden.map((view) => view.toolCallId)).toEqual(["a", "b"]);
  });
});

describe("stalledOnIntent", () => {
  const assistant = (parts: UIMessage["parts"]): UIMessage => ({ id: "a1", role: "assistant", parts });
  const call = { type: "tool-read_file", toolCallId: "t1", state: "output-available", input: {}, output: "" } as UIMessage["parts"][number];
  it("flags a text-only last step that announces the next step after tool calls", () => {
    expect(stalledOnIntent([assistant([{ type: "step-start" }, call, { type: "step-start" }, { type: "text", text: "Let me check what's in the codebase." }])])).toBe(true);
  });
  it("ignores an answer, a question, a reply with no tool calls and a step that calls a tool", () => {
    expect(stalledOnIntent([assistant([{ type: "step-start" }, call, { type: "step-start" }, { type: "text", text: "The plan is done." }])])).toBe(false);
    expect(stalledOnIntent([assistant([{ type: "step-start" }, call, { type: "step-start" }, { type: "text", text: "Let me know which one?" }])])).toBe(false);
    expect(stalledOnIntent([assistant([{ type: "step-start" }, { type: "text", text: "Let me check." }])])).toBe(false);
    expect(stalledOnIntent([assistant([{ type: "step-start" }, call, { type: "step-start" }, { type: "text", text: "Let me check." }, call])])).toBe(false);
  });
});
