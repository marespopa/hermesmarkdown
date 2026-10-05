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

describe("ChatMessageItem template save card", () => {
  const block = { fileName: "rfc.md", content: "# {{title}}\n{{dat}}\n" };

  afterEach(() => cleanup());

  it("shows a card per template block with its path and lint warnings", () => {
    renderItem({ templateBlocks: [block], templatesFolder: "templates", onSaveTemplate: vi.fn() });
    expect(screen.getByText("templates/rfc.md")).toBeTruthy();
    expect(screen.getByText(/\{\{dat\}\} looks like \{\{date\}\}/)).toBeTruthy();
    expect(screen.getByText("Save template")).toBeTruthy();
  });

  it("offers Replace template when the file exists", () => {
    renderItem({ templateBlocks: [block], templateExists: () => true, onSaveTemplate: vi.fn() });
    expect(screen.getByText("Replace template")).toBeTruthy();
  });

  it("saves only on click, then shows Saved", async () => {
    const onSaveTemplate = vi.fn().mockResolvedValue(true);
    renderItem({ templateBlocks: [block], onSaveTemplate });
    expect(onSaveTemplate).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByText("Save template"));
    });
    expect(onSaveTemplate).toHaveBeenCalledWith(block);
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("offers saving again after the reply is edited in place", async () => {
    const onSaveTemplate = vi.fn().mockResolvedValue(true);
    const props = { templateBlocks: [block], onSaveTemplate, templateExists: () => false };
    const { rerender } = renderItem(props);
    await act(async () => {
      fireEvent.click(screen.getByText("Save template"));
    });
    expect(screen.getByText("Saved")).toBeTruthy();

    // The file now exists and the block's body was edited.
    const edited = { fileName: "rfc.md", content: "# {{title}}\nOwner: {{prompt:Owner}}\n" };
    rerender(
      <ChatMessageItem
        message={reply}
        isEditing={false}
        editDraft=""
        onEditDraftChange={vi.fn()}
        onStartEdit={vi.fn()}
        onCommitEdit={vi.fn()}
        onApply={vi.fn()}
        hasSelection={false}
        templateBlocks={[edited]}
        onSaveTemplate={onSaveTemplate}
        templateExists={() => true}
      />
    );
    const button = screen.getByText("Replace template").closest("button");
    expect(button?.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(screen.getByText("Replace template"));
    });
    expect(onSaveTemplate).toHaveBeenLastCalledWith(edited);
  });

  it("disables saving without a vault", () => {
    renderItem({ templateBlocks: [block] });
    const button = screen.getByText("Open a vault to save").closest("button");
    expect(button?.disabled).toBe(true);
  });
});
