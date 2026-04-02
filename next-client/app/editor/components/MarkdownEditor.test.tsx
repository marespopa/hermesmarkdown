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

  it("highlights search terms correctly", () => {
    // Render directly with the search term to ensure the highlight function
    // runs with the term on the first pass
    const { container } = renderEditor("Find this word", {
      searchTerm: "word",
    });

    // The highlighter replaces 'word' with <mark>word</mark>
    const mark = container.querySelector("mark");

    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent("word");
    expect(mark).toHaveClass("bg-blue-500/20");
  });

  it("processes time shortcode '{time}'", () => {
    renderEditor("");
    const textarea = screen.getByRole("textbox");

    // Trigger change with shortcode
    fireEvent.change(textarea, { target: { value: "{time}" } });

    // Match HH:MM format
    const callValue = mockOnChange.mock.calls[0][0];
    expect(callValue).toMatch(/^\d{2}:\d{2}$/);
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
});
