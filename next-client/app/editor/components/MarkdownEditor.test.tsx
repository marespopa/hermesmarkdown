import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditorView } from "@codemirror/view";
import { undo } from "@codemirror/commands";
import MarkdownEditor from "./MarkdownEditor";
import { Provider } from "jotai";
import "@testing-library/jest-dom";

// MarkdownEditor now runs on CodeMirror 6, which renders a contenteditable
// div rather than a <textarea> — there's no getByRole("textbox") to grab.
// jsdom also can't do real layout, so coordinate-based interactions
// (Ctrl+click hit-testing, coordsAtPos-positioned widgets) aren't
// reliably testable here; that logic is covered by the pure command-layer
// tests instead (commands.test.ts, table-commands.test.ts, etc. in
// app/editor/codemirror/). This file covers the integration surface:
// mounting, the value/onChange contract, and frontmatter separation.
//
// EditorView.findFromDOM recovers the live CM6 instance from its DOM node,
// so interaction tests can dispatch real transactions instead of trying to
// simulate contenteditable typing (which jsdom doesn't emulate reliably).

vi.mock("@/app/atoms/atoms", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { atom } = await import("jotai");
  return {
    ...actual,
    atom_wordWrap: atom(true),
    atom_renderedFontSize: atom("16px"),
    atom_lineHeight: atom("1.8"),
    atom_isEditorFocused: atom(false),
    atom_cursorPosition: atom({ line: 1, col: 1 }),
    atom_editorWidth: atom("standard"),
    atom_selectionCount: atom(0),
    atom_isAiConfigured: atom(true),
    atom_isAiBusy: atom(false),
    atom_frontmatterWizardOpen: atom(null),
  };
});

function getView(container: HTMLElement): EditorView {
  const content = container.querySelector(".cm-content");
  if (!content) throw new Error(".cm-content not found — CM6 failed to mount");
  const view = EditorView.findFromDOM(content as HTMLElement);
  if (!view) throw new Error("Could not recover EditorView from DOM");
  return view;
}

describe("MarkdownEditor", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const renderEditor = (value = "", props = {}) =>
    render(
      <Provider>
        <MarkdownEditor value={value} onChange={mockOnChange} {...props} />
      </Provider>,
    );

  it("mounts a CodeMirror 6 editor", () => {
    const { container } = renderEditor("hello world");
    expect(container.querySelector(".cm-content")).toBeInTheDocument();
  });

  it("shows the initial value in the editor", () => {
    const { container } = renderEditor("hello world");
    expect(container.querySelector(".cm-content")?.textContent).toContain("hello world");
  });

  it("shows the placeholder text when empty", () => {
    renderEditor("", { placeholder: "Type / for templates" });
    expect(screen.getByText("Type / for templates")).toBeInTheDocument();
  });

  it("strips frontmatter out of the CM6 doc and shows it via FrontmatterPanel instead", () => {
    const value = "---\ntitle: Test\n---\nBody content";
    const { container } = renderEditor(value);
    const cmText = container.querySelector(".cm-content")?.textContent ?? "";
    expect(cmText).not.toContain("title: Test");
    expect(cmText).toContain("Body content");
  });

  it("calls onChange with the full value (frontmatter + body) when the doc changes", () => {
    const { container } = renderEditor("hello");
    const view = getView(container);

    act(() => {
      view.dispatch({ changes: { from: 5, to: 5, insert: " world" } });
    });

    expect(mockOnChange).toHaveBeenCalledWith("hello world");
  });

  it("preserves frontmatter when the body changes", () => {
    const value = "---\ntitle: Test\n---\nBody";
    const { container } = renderEditor(value);
    const view = getView(container);

    act(() => {
      view.dispatch({ changes: { from: 4, to: 4, insert: "!" } });
    });

    expect(mockOnChange).toHaveBeenCalledWith("---\ntitle: Test\n---\nBody!");
  });

  it("supports undo via CM6's native history", () => {
    const { container } = renderEditor("hello");
    const view = getView(container);

    act(() => {
      view.dispatch({ changes: { from: 5, to: 5, insert: " world" }, userEvent: "input.type" });
    });
    expect(view.state.doc.toString()).toBe("hello world");

    act(() => {
      undo(view);
    });
    expect(view.state.doc.toString()).toBe("hello");
  });

  it("re-syncs the CM6 doc when the value prop changes externally", () => {
    const { container, rerender } = renderEditor("first");
    rerender(
      <Provider>
        <MarkdownEditor value="second" onChange={mockOnChange} />
      </Provider>,
    );
    expect(container.querySelector(".cm-content")?.textContent).toContain("second");
  });
});
