import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "jotai";
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
const loadSources = vi.fn(async () => ({ sheets: [], childNotes: [], failed: 0, sensitive: false }));
vi.mock("../hooks/use-rollup-sources", () => ({ useRollupSources: () => ({ loadSources, preferredFolder: vi.fn() }) }));

function renderChat() {
  render(
    <Provider>
      <AIChatDialog isOpen onClose={vi.fn()} documentContent="" selectedText="" onApply={vi.fn()} />
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
