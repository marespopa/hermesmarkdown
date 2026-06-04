import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownEditor from "./MarkdownEditor";
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

  it("shows date picker when cursor is on a date and clicked", async () => {
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

    // Calendar should NOT be expanded initially
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();

    // Click to expand
    act(() => {
      fireEvent.click(textarea);
    });
    expect(screen.getByText("June 2026")).toBeInTheDocument();

    // Find and click the new Close button
    const closeButton = screen.getByTitle("Close calendar");
    expect(closeButton).toBeInTheDocument();
    
    act(() => {
      fireEvent.click(closeButton);
    });
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();
    
    vi.useRealTimers();
    });

    it("updates date and preserves wiki-link format", async () => {
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

    // Click to expand
    act(() => {
      fireEvent.click(textarea);
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
