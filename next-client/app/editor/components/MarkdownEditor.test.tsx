import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownEditor from "./MarkdownEditor";
import { Provider } from "jotai";
import "@testing-library/jest-dom";

// Mocking atoms with default values
vi.mock("@/app/atoms/atoms", async () => {
  const { atom } = await import("jotai");
  return {
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

  // --- Existing Tests ---

  it("renders the placeholder text when value is empty", () => {
    renderEditor({ placeholder: "Type something..." });
    expect(screen.getByText("Type something...")).toBeInTheDocument();
  });

  it("calls onChange when the user types", () => {
    renderEditor({ value: "Hello" });
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello World" } });
    expect(mockOnChange).toHaveBeenCalledWith("Hello World");
  });

  // --- New Logic Tests ---

  it("toggles a checkbox from [ ] to [x] when clicked", () => {
    const initialValue = "- [ ] Task item";
    renderEditor({ value: initialValue });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Simulate clicking at the start of the line (index 0)
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;

    fireEvent.click(textarea);

    // Expected: index 3 (the space) becomes 'x'
    expect(mockOnChange).toHaveBeenCalledWith("- [x] Task item");
  });

  it("untoggles a checkbox from [x] to [ ] when clicked", () => {
    const initialValue = "- [x] Completed task";
    renderEditor({ value: initialValue });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 2; // Clicking inside the brackets
    fireEvent.click(textarea);

    expect(mockOnChange).toHaveBeenCalledWith("- [ ] Completed task");
  });

  it("does not toggle if the click is far outside the checkbox area", () => {
    const initialValue = "- [ ] Task item";
    renderEditor({ value: initialValue });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Position 12 is at the end of "Task item"
    textarea.selectionStart = 12;
    fireEvent.click(textarea);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("renders fenced code blocks with correct structure and styles", () => {
    const codeValue = "```js\nconst x = 1;\n```";
    const { container } = renderEditor({ value: codeValue });

    const codeSpan = container.querySelector('span[style*="white-space: pre"]');
    expect(codeSpan).toBeInTheDocument();
    expect(codeSpan).toHaveClass("bg-zinc-100");

    const langSpan = container.querySelector(".text-blue-500");
    expect(langSpan).toHaveTextContent("js");
  });

  it("opens a link in a new tab when Ctrl/Meta is pressed during click", () => {
    const windowSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const linkValue = "[Google](https://google.com)";
    renderEditor({ value: linkValue });

    const textarea = screen.getByRole("textbox");

    // Simulate Ctrl + Click
    fireEvent.click(textarea, {
      ctrlKey: true,
      selectionStart: 5, // Inside the link text
    });

    expect(windowSpy).toHaveBeenCalledWith(
      "https://google.com",
      "_blank",
      "noopener,noreferrer",
    );
    windowSpy.mockRestore();
  });

  it("applies the correct font-family and font-size from atoms", () => {
    const { container } = renderEditor({ value: "Text" });
    const editorContainer = container.querySelector(".editor-container");

    expect(editorContainer).toHaveStyle({
      fontFamily: "monospace",
      fontSize: "16px",
    });
  });
});
