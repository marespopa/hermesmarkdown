import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatMessageItem from "./ChatMessageItem";
import type { ChatMessage } from "./chat-helpers";

const reply: ChatMessage = {
  role: "assistant",
  displayContent: "# Title\n\n- **bold** item",
  apiContent: "# Title\n\n- **bold** item",
};

function renderItem(overrides: Partial<React.ComponentProps<typeof ChatMessageItem>> = {}) {
  return render(
    <ChatMessageItem
      message={reply}
      isEditing={false}
      editDraft=""
      onEditDraftChange={vi.fn()}
      onStartEdit={vi.fn()}
      onCommitEdit={vi.fn()}
      onApply={vi.fn()}
      hasSelection={false}
      {...overrides}
    />
  );
}

describe("ChatMessageItem copy", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("copies the assistant reply as raw Markdown and confirms", async () => {
    renderItem();
    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy response as Markdown"));
    });
    expect(writeText).toHaveBeenCalledWith("# Title\n\n- **bold** item");
    expect(screen.getByText("Copied")).toBeTruthy();
  });

  it("reverts the confirmation after a moment", async () => {
    vi.useFakeTimers();
    renderItem();
    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy response as Markdown"));
    });
    expect(screen.getByText("Copied")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText("Copy")).toBeTruthy();
  });

  it("copies the in-progress draft while editing", async () => {
    renderItem({ isEditing: true, editDraft: "edited *draft*" });
    await act(async () => {
      fireEvent.click(screen.getByTitle("Copy response as Markdown"));
    });
    expect(writeText).toHaveBeenCalledWith("edited *draft*");
  });

  it("does not offer copy on user messages", () => {
    renderItem({ message: { role: "user", displayContent: "hi", apiContent: "hi" } });
    expect(screen.queryByTitle("Copy response as Markdown")).toBeNull();
  });
});
