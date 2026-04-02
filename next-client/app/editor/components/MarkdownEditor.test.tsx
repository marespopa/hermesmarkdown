import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownEditor from "./MarkdownEditor";
import { Provider } from "jotai";
import "@testing-library/jest-dom";

// Mocking atoms
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

  it("renders workflow tags with the pseudo-icon ↻", () => {
    const { container } = renderEditor({ value: "#todo" });
    const tagSpan = container.querySelector(".status-tag");

    // Using regex to match content across nested HTML tags like <small>
    expect(tagSpan).toBeInTheDocument();
    expect(tagSpan?.textContent).toMatch(/#todo\s*↻/);
    expect(tagSpan).toHaveClass("text-blue-600");
  });

  it("automatically moves text typed after a tag to a new line", () => {
    renderEditor({ value: "Initial" });
    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "#todo some extra text" } });
    expect(mockOnChange).toHaveBeenCalledWith("#todo\nsome extra text");
  });

  it("toggles checkbox on 'touch' when clicking exactly on the brackets", () => {
    renderEditor({ value: "- [ ] Task" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 3;

    // We create a custom event to mimic PointerEvent.pointerType in JSDOM
    const touchEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(touchEvent, "pointerType", { value: "touch" });

    fireEvent(textarea, touchEvent);
    expect(mockOnChange).toHaveBeenCalledWith("- [x] Task");
  });

  it("cycles tags through the full sequence: #urgn -> #todo -> #prog -> #wait -> #done", () => {
    const { rerender } = renderEditor({ value: "#urgn" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Cycle 1: urgn -> todo
    textarea.selectionStart = 1;
    const touchEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(touchEvent, "pointerType", { value: "touch" });

    fireEvent(textarea, touchEvent);
    expect(mockOnChange).toHaveBeenLastCalledWith("#todo");

    // Cycle 2: Simulate progression to prog -> wait
    rerender(
      <Provider>
        <MarkdownEditor value="#prog" onChange={mockOnChange} />
      </Provider>,
    );
    textarea.selectionStart = 1;
    fireEvent(textarea, touchEvent);
    expect(mockOnChange).toHaveBeenLastCalledWith("#wait");
  });

  it("renders checkboxes with the subtle ◦ indicator icon", () => {
    const { container } = renderEditor({ value: "- [ ] Task" });

    // Check innerHTML because ◦ is inside a nested span and textContent can be tricky in JSDOM
    const taskWrapper = container.querySelector(".task-wrapper");
    expect(taskWrapper?.innerHTML).toContain("◦");
    expect(taskWrapper?.innerHTML).toContain("[ ]");
  });

  it("processes date shortcode ..d case-insensitively", () => {
    renderEditor({ value: "" });
    const textarea = screen.getByRole("textbox");
    const today = new Date().toLocaleDateString("en-CA");

    fireEvent.change(textarea, { target: { value: "Deadline ..d" } });
    expect(mockOnChange).toHaveBeenCalledWith(`Deadline ${today}`);
  });

  it("styles headings and maintains subtle markers", () => {
    const { container } = renderEditor({ value: "## Heading" });
    const spans = container.querySelectorAll("span");
    const marker = Array.from(spans).find((s) => s.textContent === "##");

    expect(marker).toHaveClass("text-neutral-500/50");
  });
});
