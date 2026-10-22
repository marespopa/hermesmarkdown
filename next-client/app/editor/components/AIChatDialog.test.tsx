import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createStore, Provider } from "jotai";
import { atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import AIChatDialog from "./AIChatDialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const callAIChat = vi.fn();
vi.mock("@/app/services/ai", () => ({ callAIChat: (...args: unknown[]) => callAIChat(...args) }));
vi.mock("./ai-chat/use-chat-models", () => ({
  useChatModels: () => ({ modelOptions: [], selectedAiModel: "", setSelectedAiModel: vi.fn(), isFetchingModels: false }),
}));
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: () => ({ scanVault: vi.fn(), indexVaultTags: vi.fn() }),
}));
vi.mock("@/app/components/Toastr", () => ({ showErrorToast: vi.fn() }));
const loadDailySheets = vi.fn(async () => []);
vi.mock("../hooks/use-daily-sheets", () => ({ useDailySheets: () => ({ loadDailySheets }) }));

function renderChat(documentContent = "", currentFilePath?: string, store?: ReturnType<typeof createStore>) {
  render(
    <Provider store={store}>
      <AIChatDialog isOpen onClose={vi.fn()} documentContent={documentContent} selectedText="" currentFilePath={currentFilePath} onApply={vi.fn()} />
    </Provider>,
  );
  return screen.getByPlaceholderText(/Ask anything/);
}

async function send(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  await act(async () => {
    fireEvent.keyDown(input, { key: "Enter" });
  });
}

describe("AIChatDialog template skill", () => {
  beforeEach(() => {
    callAIChat.mockReset();
  });

  it("adds the skill to the system prompt only once a message mentions templates", async () => {
    callAIChat.mockResolvedValueOnce("Sure.");
    callAIChat.mockResolvedValueOnce("~~~~hermes-template rfc.md\n# {{title}}\nOwner: {{prompt:Owner}}\n~~~~");
    const input = renderChat();

    await send(input, "hello there");
    expect(callAIChat.mock.calls[0][0]).not.toContain("--- SKILL ---");

    await send(input, "make me an RFC template that asks for an owner");
    expect(callAIChat.mock.calls[1][0]).toContain("--- SKILL ---");
    expect(callAIChat.mock.calls[1][0]).toContain("~~~~hermes-template");

    // The reply's block gets a save card; without a vault it can't save.
    expect(await screen.findByText("templates/rfc.md")).toBeInTheDocument();
    expect(screen.getByText("Open a vault to save")).toBeInTheDocument();
  });
});

describe("AIChatDialog tasks skill", () => {
  beforeEach(() => {
    callAIChat.mockReset();
  });

  it("sends the open tasks with /tasks", async () => {
    callAIChat.mockResolvedValueOnce("Start with the release notes.");
    const input = renderChat();
    await send(input, "/tasks what should I do first?");
    expect(callAIChat.mock.calls[0][0]).toContain("Skill: work with the user's HermesMarkdown tasks.");
    expect(callAIChat.mock.calls[0][0]).toContain("--- OPEN TASKS");
  });
});

describe("AIChatDialog private active note", () => {
  const PRIVATE = "---\nprivate: true\n---\nSecret diary entry";

  beforeEach(() => {
    callAIChat.mockReset();
    callAIChat.mockResolvedValue("ok");
  });

  it("does not send a veiled private note, and the header chip is hidden", async () => {
    const input = renderChat(PRIVATE, "notes/diary.md");
    expect(screen.queryByTitle("The AI sees notes/diary.md")).not.toBeInTheDocument();
    await send(input, "hello there");
    expect(callAIChat.mock.calls[0][0]).not.toContain("Secret diary entry");
    expect(callAIChat.mock.calls[0][0]).not.toContain("ACTIVE FILE");
  });

  it("sends a private note once it is revealed, and shows the chip", async () => {
    const store = createStore();
    store.set(atom_revealedPrivatePaths, new Set(["notes/diary.md"]));
    const input = renderChat(PRIVATE, "notes/diary.md", store);
    expect(screen.getByTitle("The AI sees notes/diary.md")).toBeInTheDocument();
    await send(input, "hello there");
    expect(callAIChat.mock.calls[0][0]).toContain("Secret diary entry");
  });

  it("still sends a normal note", async () => {
    const input = renderChat("Plain note", "notes/plain.md");
    await send(input, "hello there");
    expect(callAIChat.mock.calls[0][0]).toContain("Plain note");
  });
});
