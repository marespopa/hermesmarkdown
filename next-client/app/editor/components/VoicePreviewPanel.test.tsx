import { render, screen, fireEvent, act } from "@testing-library/react";
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

  // Regression: autofocusing on mobile pops the on-screen keyboard even
  // during pure dictation (no typing needed), which then covers the panel.
  it("does not autofocus the textarea on mobile", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      renderPanel({ isListening: true, previewText: "" });
      expect(screen.getByPlaceholderText(PLACEHOLDER)).not.toHaveFocus();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  // Regression: a `fixed bottom-*` panel doesn't move on its own when the
  // on-screen keyboard opens, so it must track visualViewport shrinkage and
  // lift itself clear instead of rendering underneath the keyboard.
  it("lifts the panel above the on-screen keyboard via visualViewport", () => {
    const listeners: Record<string, Array<() => void>> = {};
    const vv = {
      height: 800,
      addEventListener: (type: string, cb: () => void) => {
        (listeners[type] ??= []).push(cb);
      },
      removeEventListener: vi.fn(),
    };
    const originalVv = window.visualViewport;
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    try {
      renderPanel({ isListening: true, previewText: "" });
      const panel = document.querySelector("[data-voice-preview-panel]") as HTMLElement;
      expect(panel.style.bottom).toBe("80px");

      // Keyboard opens: visualViewport shrinks by 300px.
      act(() => {
        vv.height = 500;
        listeners["resize"]?.forEach((cb) => cb());
      });

      expect(panel.style.bottom).toBe("316px");
    } finally {
      Object.defineProperty(window, "visualViewport", { value: originalVv, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
    }
  });
});
