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

vi.mock("@/app/hooks/use-is-mobile", () => ({
  default: () => false,
}));

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

  it("renders workflow tags with the pseudo-icon ↻", () => {
    const { container } = renderEditor({ value: "#todo" });

    // We look specifically for the status-tag span to avoid the textarea duplicate
    const tagSpan = container.querySelector(".status-tag");

    expect(tagSpan).toBeInTheDocument();
    expect(tagSpan?.textContent).toMatch(/#todo\s*↻/i);

    // Also verify the icon specifically exists
    const icon = screen.getByText("↻");
    expect(icon).toBeInTheDocument();
  });

  it("automatically moves text typed after a tag to a new line", () => {
    renderEditor({ value: "#todo" });
    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "#todo extra text" } });
    expect(mockOnChange).toHaveBeenCalledWith("#todo\nextra text");
  });

  it("toggles checkbox when clicking brackets with Ctrl key", () => {
    renderEditor({ value: "- [ ] Task" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Position cursor inside the brackets [ ]
    textarea.selectionStart = 3;
    fireEvent.click(textarea, { ctrlKey: true });

    expect(mockOnChange).toHaveBeenCalledWith("- [x] Task");
  });

  it("cycles tags through the sequence: #urgn -> #todo -> #prog -> #wait -> #done", () => {
    const { rerender } = renderEditor({ value: "#urgn" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 2;
    fireEvent.click(textarea, { ctrlKey: true });
    expect(mockOnChange).toHaveBeenLastCalledWith("#todo");

    rerender(
      <Provider>
        <MarkdownEditor value="#prog" onChange={mockOnChange} />
      </Provider>,
    );

    const updatedTextarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    updatedTextarea.selectionStart = 2;
    fireEvent.click(updatedTextarea, { ctrlKey: true });

    expect(mockOnChange).toHaveBeenLastCalledWith("#wait");
  });

  it("renders checkboxes with the subtle ◦ indicator icon", () => {
    renderEditor({ value: "- [ ] Task" });

    // Validate text exists in the document regardless of class names
    expect(screen.getByText("◦")).toBeInTheDocument();
    expect(screen.getByText("[ ]")).toBeInTheDocument();
    expect(screen.getByText("Task")).toBeInTheDocument();
  });

  it("processes date shortcode ..d", () => {
    renderEditor({ value: "" });
    const textarea = screen.getByRole("textbox");
    const today = new Date().toLocaleDateString("en-CA");

    fireEvent.change(textarea, { target: { value: "Deadline ..d" } });
    expect(mockOnChange).toHaveBeenCalledWith(`Deadline ${today}`);
  });

  it("renders heading markers in the background layer", () => {
    const { container } = renderEditor({ value: "## Heading" });

    // Find the marker by text content
    const spans = container.querySelectorAll("span");
    const marker = Array.from(spans).find((s) => s.textContent === "##");

    expect(marker).toBeInTheDocument();
    expect(screen.getByText("Heading")).toBeInTheDocument();
  });
});
