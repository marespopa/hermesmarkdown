import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownEditor from "./MarkdownEditor";
import { Provider } from "jotai";
import "@testing-library/jest-dom";

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

  it("applies highlighting to markdown syntax", () => {
    const { container } = renderEditor({ value: "# Heading" });

    // Based on your code logic for Section 2 (Headings)
    const syntaxSpan = container.querySelector(".opacity-25");
    expect(syntaxSpan).toBeInTheDocument();
    expect(syntaxSpan).toHaveTextContent("#");
  });

  it("highlights search terms when provided", () => {
    const { container } = renderEditor({
      value: "Search for this",
      searchTerm: "Search",
    });

    const mark = container.querySelector("mark");
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent("Search");
  });

  it("triggers onTextareaReady callback on mount", () => {
    const mockReady = vi.fn();
    renderEditor({ onTextareaReady: mockReady });

    expect(mockReady).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
  });
});
