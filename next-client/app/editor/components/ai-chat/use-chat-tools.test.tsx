import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { extractTasks } from "@/app/utils/taskExtractor";
import { MAX_TOOL_ROUNDS, useChatTools } from "./use-chat-tools";

const callAIChatTurn = vi.hoisted(() => vi.fn());
vi.mock("@/app/services/ai", () => ({ callAIChatTurn }));
const searchNoteContent = vi.hoisted(() => vi.fn());
vi.mock("@/app/services/content-search-client", () => ({ searchNoteContent }));
const addJot = vi.hoisted(() => vi.fn());
vi.mock("../../hooks/use-quick-jot", () => ({ useQuickJot: () => ({ addJot }) }));
const readCurrentText = vi.hoisted(() => vi.fn());
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({ useNoteBuffer: () => ({ readCurrentText }) }));

function note(path: string, content: string, frontmatter: Record<string, unknown> = {}): FileMetadata {
  return {
    path, name: path.split("/").pop()!, tags: [], links: [], frontmatter, modifiedAt: 1, wordCount: 0,
    tasks: extractTasks(path, content), handle: null,
  } as FileMetadata;
}

const call = (toolName: string, input: unknown, id = "call-1") => ({ toolCallId: id, toolName, input });
const turnWith = (...calls: ReturnType<typeof call>[]) => ({
  text: "",
  toolCalls: calls,
  responseMessages: [{ role: "assistant", content: calls.map((c) => ({ type: "tool-call", ...c })) }],
});

function setup() {
  const store = createStore();
  store.set(atom_vaultHandle, { name: "Notes" } as unknown as FileSystemDirectoryHandle);
  store.set(atom_fileMetadata, {
    "projects/Roadmap.md": note("projects/Roadmap.md", "- [/] Draft the Q4 plan @due(2026-10-09)\n- [ ] Review pricing"),
    "private/Health.md": note("private/Health.md", "- [ ] Private task", { private: true }),
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => useChatTools(), { wrapper });
}

// The tool-result text sent back for the last tool round.
const lastToolResult = () => {
  const conversation = callAIChatTurn.mock.calls.at(-1)![1] as { role: string; content: { output: { value: string } }[] }[];
  return conversation.at(-1)!.content[0].output.value;
};

describe("useChatTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
  });

  it("runs the tools the model calls and sends their results back until it answers", async () => {
    callAIChatTurn
      .mockResolvedValueOnce(turnWith(call("list_open_tasks", { view: "overdue" })))
      .mockResolvedValueOnce({ text: "Draft the Q4 plan is overdue." });
    const { result } = setup();
    const activity: string[] = [];

    let reply = "";
    await act(async () => {
      reply = await result.current.converse("system", [{ role: "user", content: "What's overdue?" }], (line) => activity.push(line));
    });

    expect(reply).toBe("Draft the Q4 plan is overdue.");
    expect(activity).toEqual(["Looked at overdue tasks"]);
    const conversation = callAIChatTurn.mock.calls[1][1];
    expect(conversation[1]).toMatchObject({ role: "assistant" });
    expect(conversation[2]).toMatchObject({ role: "tool", content: [{ type: "tool-result", toolCallId: "call-1", toolName: "list_open_tasks" }] });
    expect(lastToolResult()).toContain("- [/] Draft the Q4 plan @due(2026-10-09) · [[Roadmap]]");
    expect(lastToolResult()).not.toContain("Review pricing");
  });

  it("searches only notes that aren't private, and won't read a private one", async () => {
    searchNoteContent.mockResolvedValue({ hits: [{ path: "private/Health.md", name: "Health.md", line: 1, column: 0, snippet: "secret" }], pending: 0, capped: false });
    readCurrentText.mockResolvedValue("- [ ] Private task");
    callAIChatTurn
      .mockResolvedValueOnce(turnWith(call("search_notes", { query: "roadmap" })))
      .mockResolvedValueOnce(turnWith(call("read_note", { name: "Health" })))
      .mockResolvedValueOnce({ text: "Done." });
    const { result } = setup();

    await act(async () => {
      await result.current.converse("system", [{ role: "user", content: "Find my roadmap" }], () => {});
    });

    expect(searchNoteContent).toHaveBeenCalledWith("roadmap", ["projects/Roadmap.md"], 8);
    const searchResult = (callAIChatTurn.mock.calls[1][1] as { content: { output: { value: string } }[] }[]).at(-1)!.content[0].output.value;
    expect(searchResult).toContain("[[Roadmap]]");
    expect(searchResult).not.toContain("secret");
    expect(lastToolResult()).toContain("is private");
  });

  it("adds to today's sheet only after the user approves", async () => {
    addJot.mockResolvedValue({ result: "added", sheetName: "2026-10-12" });
    callAIChatTurn
      .mockResolvedValueOnce(turnWith(call("add_to_today", { lines: ["- [ ] Call the vendor", "- [ ] Send the invoice"] })))
      .mockResolvedValueOnce({ text: "Added both." });
    const { result } = setup();

    let pending!: Promise<string>;
    act(() => {
      pending = result.current.converse("system", [{ role: "user", content: "Add these to today" }], () => {});
    });
    await waitFor(() => expect(result.current.approval?.lines).toEqual(["- [ ] Call the vendor", "- [ ] Send the invoice"]));
    expect(addJot).not.toHaveBeenCalled();

    await act(async () => {
      result.current.approval!.approve();
      await pending;
    });
    expect(addJot.mock.calls.map(([line]) => line)).toEqual(["- [ ] Call the vendor", "- [ ] Send the invoice"]);
    expect(lastToolResult()).toBe("Added 2 lines to [[2026-10-12]].");
    expect(result.current.approval).toBeNull();
  });

  it("tells the model when the user declines, and writes nothing", async () => {
    callAIChatTurn
      .mockResolvedValueOnce(turnWith(call("add_to_today", { lines: ["- [ ] Call the vendor"] })))
      .mockResolvedValueOnce({ text: "Okay, nothing added." });
    const { result } = setup();

    let pending!: Promise<string>;
    act(() => {
      pending = result.current.converse("system", [{ role: "user", content: "Add this" }], () => {});
    });
    await waitFor(() => expect(result.current.approval).not.toBeNull());
    await act(async () => {
      result.current.cancelApproval();
      await pending;
    });

    expect(addJot).not.toHaveBeenCalled();
    expect(lastToolResult()).toMatch(/declined/);
  });

  it("stops after the round limit", async () => {
    callAIChatTurn.mockResolvedValue(turnWith(call("list_open_tasks", {})));
    const { result } = setup();
    let reply = "";
    await act(async () => {
      reply = await result.current.converse("system", [{ role: "user", content: "Loop" }], () => {});
    });
    expect(callAIChatTurn).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(reply).toMatch(/stopped/);
  });
});
