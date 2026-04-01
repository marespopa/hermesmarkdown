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

describe("MarkdownEditor Component", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const renderEditor = (props = {}) => {
    return render(
      <Provider>
        <MarkdownEditor value="" onChange={mockOnChange} {...props} />
      </Provider>,
    );
  };

  it("renders placeholder and handles basic typing", () => {
    renderEditor({ placeholder: "Start..." });
    expect(screen.getByText("Start...")).toBeInTheDocument();
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "New Content" } });
    expect(mockOnChange).toHaveBeenCalledWith("New Content");
  });

  it("renders headings with subtle symbols", () => {
    const { container } = renderEditor({ value: "### My Heading" });

    const spans = container.querySelectorAll("span");
    const hashSpan = Array.from(spans).find((s) => s.textContent === "###");
    const textSpan = Array.from(spans).find(
      (s) => s.textContent === " My Heading",
    );

    expect(hashSpan).toBeInTheDocument();
    // Matches the color class in your SUBTLE_STYLE
    expect(hashSpan).toHaveClass("text-neutral-500/50");
    expect(textSpan).toHaveClass("font-semibold");
  });

  it("renders fenced code blocks without extra rows", () => {
    const codeValue = "```js\nconst x = 1;\n```";
    const { container } = renderEditor({ value: codeValue });

    const outerSpan = container.querySelector(
      'span[style*="white-space: pre-wrap"]',
    );
    expect(outerSpan).toHaveClass("bg-zinc-100/50");

    expect(container.textContent).toContain("```js");
    expect(container.textContent).toContain("const x = 1;");
    expect(container.textContent).toContain("```");
  });

  it("styles bold and italic text symbols as subtle", () => {
    const { container } = renderEditor({ value: "**bold text**" });

    const spans = Array.from(container.querySelectorAll("span"));
    const boldSymbols = spans.filter((s) => s.textContent === "**");
    const boldText = container.querySelector("strong");

    expect(boldSymbols).toHaveLength(2);
    // Updated from opacity-25 to the current color class
    expect(boldSymbols[0]).toHaveClass("text-neutral-500/50");
    expect(boldText).toHaveTextContent("bold text");
  });

  it("renders blockquotes with subtle markers", () => {
    const { container } = renderEditor({ value: "> Quote" });
    expect(container.textContent).toContain(">");
    expect(container.textContent).toContain("Quote");
  });

  it("toggles checkboxes when clicked directly on the bracket marker", () => {
    const initialValue = "- [ ] Task";
    renderEditor({ value: initialValue });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Index 3 is the space inside "[ ]"
    // This should toggle WITHOUT any modifier keys
    textarea.selectionStart = 3;
    fireEvent.click(textarea);

    expect(mockOnChange).toHaveBeenCalledWith("- [x] Task");
  });

  it("toggles checkboxes when clicking the text label ONLY if Ctrl/Meta is held", () => {
    const initialValue = "- [ ] My Task Name";
    const { rerender } = renderEditor({ value: initialValue });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Index 10 is on the letter 'k' in "Task"
    textarea.selectionStart = 10;

    // SCENARIO A: Normal click (User wants to edit text)
    fireEvent.click(textarea);
    expect(mockOnChange).not.toHaveBeenCalled();

    // SCENARIO B: Ctrl + Click (User wants to toggle from a distance)
    fireEvent.click(textarea, { ctrlKey: true });
    expect(mockOnChange).toHaveBeenCalledWith("- [x] My Task Name");
  });

  it("unchecks an already completed task", () => {
    renderEditor({ value: "- [x] Done Task" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Click on the 'x' (Index 3)
    textarea.selectionStart = 3;
    fireEvent.click(textarea);

    expect(mockOnChange).toHaveBeenCalledWith("- [ ] Done Task");
  });

  it("opens links only when Ctrl/Meta is held", () => {
    const windowSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderEditor({ value: "[Link](https://test.com)" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 1;
    fireEvent.click(textarea);
    expect(windowSpy).not.toHaveBeenCalled();

    fireEvent.click(textarea, { ctrlKey: true });
    expect(windowSpy).toHaveBeenCalledWith(
      "https://test.com",
      "_blank",
      "noopener,noreferrer",
    );
    windowSpy.mockRestore();
  });

  it("applies atom-based styles to the editor container", () => {
    const { container } = renderEditor({ value: "test" });
    const editor = container.querySelector(".editor-container");
    expect(editor).toHaveStyle({
      fontFamily: "monospace",
      fontSize: "16px",
    });
  });

  it("styles workflow tags (#todo, #done, #urgent) with specific colors", () => {
    const content = "#todo\n#done\n#urgent\n#in-progress";

    const { container } = renderEditor({ value: content });

    const spans = Array.from(container.querySelectorAll("span"));

    // Find each tag by text content
    const todoTag = spans.find((s) => s.textContent === "#todo");
    const doneTag = spans.find((s) => s.textContent === "#done");
    const urgentTag = spans.find((s) => s.textContent === "#urgent");
    const progressTag = spans.find((s) => s.textContent === "#in-progress");

    // Verify correct classes from your 'colors' mapping
    expect(todoTag).toHaveClass("text-blue-600", "dark:text-blue-400");
    expect(doneTag).toHaveClass("text-green-600", "dark:text-green-400");
    expect(urgentTag).toHaveClass("text-red-600", "dark:text-red-400");
    expect(progressTag).toHaveClass("text-amber-600", "dark:text-amber-400");

    // Verify common styling for all tags
    [todoTag, doneTag, urgentTag, progressTag].forEach((tag) => {
      expect(tag).toHaveClass("font-mono", "font-bold");
    });
  });

  it("handles workflow tags case-insensitively", () => {
    const { container } = renderEditor({ value: "#TODO" });
    const todoTag = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "#TODO",
    );

    expect(todoTag).toHaveClass("text-blue-600");
  });
});
