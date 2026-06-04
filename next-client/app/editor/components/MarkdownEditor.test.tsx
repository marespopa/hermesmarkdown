import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownEditor, { highlightMarkdown } from "./MarkdownEditor";
import { Provider } from "jotai";
import "@testing-library/jest-dom";

vi.mock("@/app/atoms/atoms", async () => {
  const { atom } = await import("jotai");
  return {
    atom_wordWrap: atom(true),
    atom_fontSize: atom("16px"),
    atom_fontFamily: atom("monospace"),
    atom_isZenModeActive: atom(false),
    atom_isEditorFocused: atom(false),
    atom_cursorPosition: atom({ line: 1, col: 1 }),
    atom_editorWidth: atom("standard"),
  };
});

describe("MarkdownEditor Functional Tests", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    document.execCommand = vi.fn();
    // Use spyOn for cleaner global function testing
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  const renderEditor = (value = "", props = {}) => {
    return render(
      <Provider>
        <MarkdownEditor value={value} onChange={mockOnChange} {...props} />
      </Provider>,
    );
  };

  it("opens external links when Ctrl/Meta clicking", () => {
    const url = "https://example.com";

    renderEditor(`[Link](${url})`);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 10;
    fireEvent.click(textarea, { ctrlKey: true });

    expect(window.open).toHaveBeenCalledWith(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("processes time shortcode '{time}'", () => {
    renderEditor("");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // We need to set selectionStart to simulate typing at the end of the shortcode
    textarea.selectionStart = 6; 
    fireEvent.change(textarea, { target: { value: "{time}" } });

    // Expect document.execCommand to be called with HH:MM format
    expect(document.execCommand).toHaveBeenCalledWith(
      "insertText",
      false,
      expect.stringMatching(/^\d{2}:\d{2}$/),
    );
  });

  it("cycles tags logic: #urgn -> #todo", () => {
    renderEditor("#urgn");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 2;
    fireEvent.click(textarea);

    expect(document.execCommand).toHaveBeenCalledWith(
      "insertText",
      false,
      "#todo",
    );
  });

  it("toggles checkbox logic: [ ] -> [x]", () => {
    renderEditor("- [ ] Task");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 3;
    fireEvent.click(textarea);

    expect(document.execCommand).toHaveBeenCalledWith("insertText", false, "x");
  });

  it("calls onChange when text is typed", () => {
    renderEditor("");
    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "Hello World" } });
    expect(mockOnChange).toHaveBeenCalledWith("Hello World");
  });

  it("calls onWikiLinkClick when Ctrl clicking a wikilink", () => {
    const onWikiLinkClick = vi.fn();
    renderEditor("[[My Note|Alias]]", { onWikiLinkClick });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 10;
    fireEvent.click(textarea, { ctrlKey: true });

    expect(onWikiLinkClick).toHaveBeenCalledWith("My Note|Alias");
  });

  it("handles Bold keyboard shortcut (Ctrl+B)", () => {
    renderEditor("hello");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    
    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;

    fireEvent.keyDown(textarea, { key: "b", ctrlKey: true });
    expect(document.execCommand).toHaveBeenCalledWith("insertText", false, "**hello**");
  });

  it("handles Italic keyboard shortcut (Ctrl+I)", () => {
    renderEditor("hello");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    
    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;

    fireEvent.keyDown(textarea, { key: "i", ctrlKey: true });
    expect(document.execCommand).toHaveBeenCalledWith("insertText", false, "_hello_");
  });

  it("shows date picker icon when cursor is on a date, and opens on click", async () => {
    vi.useFakeTimers();
    renderEditor("Today is 2026-06-04.");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Set selection and focus
    textarea.focus();
    textarea.selectionStart = 15; // middle of the date
    textarea.selectionEnd = 15;
    
    fireEvent(document, new Event("selectionchange"));

    // Advance timers to trigger debounced date detection
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Calendar should NOT be expanded automatically on focus
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();

    // Should show the trigger button
    const toggleButton = screen.getByTitle("Toggle calendar");
    expect(toggleButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(toggleButton);
    });

    // Calendar should now be expanded
    expect(screen.getByText("June 2026")).toBeInTheDocument();

    // Icon should still be visible
    expect(screen.getByTitle("Toggle calendar")).toBeInTheDocument();

    // Click icon again to toggle close
    act(() => {
      fireEvent.click(screen.getByTitle("Toggle calendar"));
    });
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();
    
    vi.useRealTimers();
    });

  it("requires explicit click on icon to open", async () => {
    vi.useFakeTimers();
    renderEditor("Today is 2026-06-04.");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // 1. Move cursor to date
    textarea.focus();
    textarea.selectionStart = 15;
    fireEvent(document, new Event("selectionchange"));

    // 2. Advance timers to detect date
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 3. Click the date text (should NOT open anymore)
    act(() => {
      fireEvent.click(textarea);
    });

    // 4. Fire another selectionchange
    fireEvent(document, new Event("selectionchange"));
    
    // 5. Advance timers again
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();

    // 6. Click the icon
    const toggleButton = screen.getByTitle("Toggle calendar");
    act(() => {
      fireEvent.click(toggleButton);
    });

    expect(screen.getByText("June 2026")).toBeInTheDocument();

    // 7. Press Escape
    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

    it("updates date and preserves wiki-link format when opened via icon", async () => {
    vi.useFakeTimers();
    renderEditor("Log for [[2026-06-04]]");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.focus();
    textarea.selectionStart = 15;

    fireEvent(document, new Event("selectionchange"));

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Click icon to expand
    const toggleButton = screen.getByTitle("Toggle calendar");
    act(() => {
      fireEvent.click(toggleButton);
    });

    // Find June 15th and click it
    const day15 = screen.getByText("15");
    act(() => {
      fireEvent.click(day15);
    });

    expect(mockOnChange).toHaveBeenCalledWith("Log for [[2026-06-15]]");
    vi.useRealTimers();
    });

  it("processes tags even if clicked at index 0", () => {
    renderEditor("#todo Task");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 0;
    fireEvent.click(textarea);

    expect(document.execCommand).toHaveBeenCalledWith(
      "insertText",
      false,
      "#prog",
    );
  });
});

describe("highlightMarkdown Zen Mode", () => {
  it("does not apply fading/blur/grayscale to inactive lines in Zen Mode", () => {
    const code = "Line 1\nLine 2\nLine 3";
    const isZenModeActive = true;
    const activeLineIndex = 1; // "Line 2" is active

    const result = highlightMarkdown(code, isZenModeActive, activeLineIndex);

    // Inactive lines (Line 1 and Line 3) should have opacity-100 and no blur/grayscale
    expect(result).not.toContain('opacity-20');
    expect(result).not.toContain('blur');
    expect(result).not.toContain('grayscale');
    
    // Specifically check an inactive line structure
    // Line 1 is index 0
    expect(result).toContain('<div class="transition-all duration-700 ease-in-out  min-h-[1.8em]">Line 1</div>');
  });

  it("applies active styles to the active line in Zen Mode", () => {
    const code = "Line 1\nLine 2";
    const isZenModeActive = true;
    const activeLineIndex = 1; // "Line 2" is active

    const result = highlightMarkdown(code, isZenModeActive, activeLineIndex);

    // Active line (Line 2)
    expect(result).toContain('bg-zinc-400/5');
    expect(result).toContain('opacity-100');
    expect(result).toContain('Line 2');
  });
});
