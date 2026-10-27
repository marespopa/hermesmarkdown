import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import {
  COMPANION_DEFAULT_WIDTH,
  COMPANION_MAX_WIDTH,
  atom_companionOpen,
  atom_companionWidth,
  atom_openCompanion,
} from "@/app/atoms/companion-atoms";
import CompanionPanel from "./CompanionPanel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const send = vi.fn();
const newChat = vi.fn();
const compact = vi.fn();
const setModel = vi.fn();
let messages: unknown[] = [];
vi.mock("./use-companion-chat", () => ({
  useCompanionChat: () => ({
    messages,
    status: "ready",
    isBusy: false,
    errorText: null,
    activities: {},
    send,
    stop: vi.fn(),
    newChat,
    compact,
    compacting: false,
    undoTurn: vi.fn(),
  }),
}));
vi.mock("../ai-chat/use-chat-models", () => ({
  useChatModels: () => ({
    modelOptions: [{ id: "sonnet-5", name: "Claude Sonnet 5" }, { id: "opus-4-8", name: "Claude Opus 4.8" }],
    selectedAiModel: "sonnet-5",
    setSelectedAiModel: setModel,
    isFetchingModels: false,
  }),
}));
vi.mock("../ai-chat/use-chat-mentions", () => ({
  useChatMentions: () => ({ mention: null, setMention: vi.fn(), mentionIndex: 0, setMentionIndex: vi.fn(), mentionOptions: [], detectMention: vi.fn(), selectMention: vi.fn() }),
}));

function setup(open = true) {
  const store = createStore();
  store.set(atom_companionOpen, open);
  render(<Provider store={store}><CompanionPanel /></Provider>);
  return store;
}

const panel = () => screen.getByRole("complementary", { hidden: true });

describe("CompanionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    messages = [];
  });

  it("takes no input while hidden", () => {
    setup(false);
    expect(panel()).toHaveAttribute("inert");
  });

  it("closes from its Close button and with Escape", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close AI panel" }));
    expect(store.get(atom_companionOpen)).toBe(false);

    act(() => store.set(atom_companionOpen, true));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Message the AI" }), { key: "Escape" });
    expect(store.get(atom_companionOpen)).toBe(false);
  });

  it("widens with the arrow keys on its edge, within bounds, and resets on double-click", () => {
    const store = setup();
    const handle = screen.getByRole("separator", { name: "Resize AI panel" });

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(store.get(atom_companionWidth)).toBe(COMPANION_DEFAULT_WIDTH + 8);

    act(() => store.set(atom_companionWidth, 10_000));
    expect(store.get(atom_companionWidth)).toBe(COMPANION_MAX_WIDTH);

    fireEvent.doubleClick(handle);
    expect(store.get(atom_companionWidth)).toBe(COMPANION_DEFAULT_WIDTH);
  });

  it("shows an entry point's note and selection as chips and sends them", async () => {
    const store = setup(false);
    act(() => store.set(atom_openCompanion, { path: "Projects/Roadmap.md", selection: "Ship the beta" }));

    expect(store.get(atom_companionOpen)).toBe(true);
    expect(screen.getByText("Roadmap.md")).toBeInTheDocument();
    expect(screen.getByText("Selection · 3 words")).toBeInTheDocument();

    const field = screen.getByRole("textbox", { name: "Message the AI" });
    fireEvent.change(field, { target: { value: "Shorten this" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(field).toHaveValue("");
    await waitFor(() => expect(send).toHaveBeenCalledWith(
      "Shorten this",
      expect.objectContaining({ path: "Projects/Roadmap.md", selection: "Ship the beta" }),
    ));
  });

  it("picks the model from its menu, whose Escape leaves the panel open", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: /Claude Sonnet 5/ }));
    fireEvent.keyDown(screen.getByRole("menuitemcheckbox", { name: /Claude Opus 4.8/ }), { key: "Escape" });
    expect(store.get(atom_companionOpen)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Claude Sonnet 5/ }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Claude Opus 4.8/ }));
    expect(setModel).toHaveBeenCalledWith("opus-4-8");
  });

  it("shows replies as Markdown, with Copy shown on the latest reply only", () => {
    messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Summarise" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "First **draft**" }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "Shorter" }] },
      { id: "a2", role: "assistant", parts: [{ type: "text", text: "- Launch\n- Pricing" }] },
    ];
    setup();

    expect(screen.getByText("draft").tagName).toBe("STRONG");
    expect(screen.getByText("Launch").closest("li")).not.toBeNull();
    const [older, latest] = screen.getAllByRole("button", { name: /Copy/ });
    expect(older.parentElement).toHaveClass("opacity-0");
    expect(latest.parentElement).not.toHaveClass("opacity-0");
  });

  it("offers New chat only once there is a thread, and no Summarize button", () => {
    setup();
    expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Summarize chat" })).toBeNull();
  });

  it("starts over from the header", () => {
    messages = [{ id: "u1", role: "user", parts: [{ type: "text", text: "Hi" }] }];
    setup();
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(newChat).toHaveBeenCalledOnce();
  });

  it("lists the commands after a slash, filters them and completes one with Enter", () => {
    setup();
    const field = screen.getByRole("textbox", { name: "Message the AI" });
    fireEvent.change(field, { target: { value: "/" } });
    expect(screen.getByRole("option", { name: /\/clear/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /\/summarize/ })).toBeInTheDocument();

    fireEvent.change(field, { target: { value: "/su" } });
    expect(screen.queryByRole("option", { name: /\/clear/ })).toBeNull();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field).toHaveValue("/summarize ");
    expect(send).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("sends a command typed in full, and lets Escape close the menu", async () => {
    setup();
    const field = screen.getByRole("textbox", { name: "Message the AI" });
    fireEvent.change(field, { target: { value: "/clear" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(send).toHaveBeenCalledWith("/clear", expect.anything()));

    fireEvent.change(field, { target: { value: "/ne" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows a compacted thread's summary as the earlier conversation", () => {
    messages = [{ id: "summary-1", role: "user", parts: [{ type: "text", text: "- Planned the launch note" }], metadata: { summary: true } }];
    setup();
    expect(screen.getByText("Earlier conversation, summarized")).toBeInTheDocument();
    expect(screen.getByText("Planned the launch note")).toBeInTheDocument();
  });
});
