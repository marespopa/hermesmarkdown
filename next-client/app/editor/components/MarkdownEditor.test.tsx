import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
});
