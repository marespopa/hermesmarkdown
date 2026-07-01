import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import VoicePreviewPanel from "./VoicePreviewPanel";

const PLACEHOLDER = /Dictated text will appear here/i;

function renderPanel(overrides: Partial<React.ComponentProps<typeof VoicePreviewPanel>> = {}) {
  const props = {
    isListening: true,
    previewText: "",
    onPreviewTextChange: vi.fn(),
    interimText: null,
    onCommit: vi.fn(),
    onDiscard: vi.fn(),
    ...overrides,
  };
  render(<VoicePreviewPanel {...props} />);
  return props;
}

describe("VoicePreviewPanel", () => {
  it("renders nothing when there's nothing to show", () => {
    renderPanel({ isListening: false, previewText: "", interimText: null });
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
  });

  it("shows while listening even with an empty draft", () => {
    renderPanel({ isListening: true, previewText: "" });
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByText(/Listening…/i)).toBeInTheDocument();
  });

  it("stays visible with an unconfirmed draft after the mic itself has stopped", () => {
    renderPanel({ isListening: false, previewText: "hello world" });
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByText(/Voice input paused/i)).toBeInTheDocument();
  });

  it("shows the live interim transcript alongside the draft", () => {
    renderPanel({ previewText: "hello", interimText: "world" });
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("forwards textarea edits via onPreviewTextChange", () => {
    const props = renderPanel({ previewText: "hello" });
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "hello there" } });
    expect(props.onPreviewTextChange).toHaveBeenCalledWith("hello there");
  });

  it("commits on Enter but not Shift+Enter", () => {
    const props = renderPanel({ previewText: "hello" });
    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(props.onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(props.onCommit).toHaveBeenCalledTimes(1);
  });

  it("does not commit on Enter when the draft is only whitespace", () => {
    const props = renderPanel({ previewText: "   " });
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: "Enter" });
    expect(props.onCommit).not.toHaveBeenCalled();
  });

  it("discards on Escape and via the close button", () => {
    const props = renderPanel({ previewText: "hello" });
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: "Escape" });
    expect(props.onDiscard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /close voice input/i }));
    expect(props.onDiscard).toHaveBeenCalledTimes(2);
  });

  it("disables Insert when the draft is empty or whitespace-only, enables it otherwise", () => {
    const { rerender } = render(
      <VoicePreviewPanel
        isListening
        previewText="   "
        onPreviewTextChange={vi.fn()}
        interimText={null}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /insert/i })).toBeDisabled();

    rerender(
      <VoicePreviewPanel
        isListening
        previewText="hello"
        onPreviewTextChange={vi.fn()}
        interimText={null}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /insert/i })).not.toBeDisabled();
  });

  // Regression: this panel renders through a Portal into document.body, so a
  // keydown fired inside it would otherwise still bubble (via React's
  // tree-based, not DOM-based, portal event propagation) up to whatever
  // real-editor keyboard handlers wrap it — e.g. the global Ctrl+B handler,
  // which would silently mutate the actual document instead of the preview.
  it("stops keydown events from bubbling out to ancestors outside the portal", () => {
    const outerHandler = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div onKeyDown={outerHandler}>
        <VoicePreviewPanel
          isListening
          previewText="hello"
          onPreviewTextChange={vi.fn()}
          interimText={null}
          onCommit={vi.fn()}
          onDiscard={vi.fn()}
        />
      </div>,
    );

    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: "b", ctrlKey: true });
    expect(outerHandler).not.toHaveBeenCalled();
  });
});
