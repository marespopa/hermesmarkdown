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

  it("toggles checkboxes when clicked in the marker zone", () => {
    renderEditor({ value: "- [ ] Task" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Index 3 is inside the [ ]
    textarea.selectionStart = 3;
    fireEvent.click(textarea);
    expect(mockOnChange).toHaveBeenCalledWith("- [x] Task");
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
});
