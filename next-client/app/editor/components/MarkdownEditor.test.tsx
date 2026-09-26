import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditorView } from "@codemirror/view";
import { undo } from "@codemirror/commands";
import MarkdownEditor from "./MarkdownEditor";
import { CODE_BLOCK_TEMPLATE_CONTENT, CURSOR_SENTINEL, TEMPLATES } from "./constants";
import { Provider, useAtomValue, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import {
  atom_activeEditorView,
  atom_frontmatterCollapsedByDefault,
  atom_lineNumbers,
} from "@/app/atoms/ui-atoms";
import { atom_pendingScrollTarget, atom_wordWrap } from "@/app/atoms/atoms";
import { findFrontmatterFoldRange, isFrontmatterFolded } from "../codemirror/frontmatter-fold";
import "@testing-library/jest-dom";

// MarkdownEditor now runs on CodeMirror 6, which renders a contenteditable
// div rather than a <textarea> — there's no getByRole("textbox") to grab.
// jsdom also can't do real layout, so coordinate-based interactions
// (Ctrl+click hit-testing, coordsAtPos-positioned widgets) aren't
// reliably testable here; that logic is covered by the pure command-layer
// tests instead (commands.test.ts, table-commands.test.ts, etc. in
// app/editor/codemirror/). This file covers the integration surface:
// mounting and the value/onChange contract.
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

function ActiveEditorObserver() {
  const activeEditorView = useAtomValue(atom_activeEditorView);
  return <output data-testid="active-editor-state">{activeEditorView ? "registered" : "none"}</output>;
}

function WordWrapToggle() {
  const setWordWrap = useSetAtom(atom_wordWrap);
  return (
    <button type="button" onClick={() => setWordWrap((current) => !current)}>
      Toggle word wrap
    </button>
  );
}

function Hydrate({
  children,
  pendingScrollTarget,
  lineNumbers = false,
  frontmatterCollapsedByDefault = false,
  wordWrap = true,
}: {
  children: React.ReactNode;
  pendingScrollTarget: { path: string; line: number } | null;
  lineNumbers?: boolean;
  frontmatterCollapsedByDefault?: boolean;
  wordWrap?: boolean;
}) {
  useHydrateAtoms([
    [atom_pendingScrollTarget, pendingScrollTarget],
    [atom_lineNumbers, lineNumbers],
    [atom_frontmatterCollapsedByDefault, frontmatterCollapsedByDefault],
    [atom_wordWrap, wordWrap],
  ]);
  return children;
}

describe("MarkdownEditor", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const renderEditor = (
    value = "",
    props = {},
    pendingScrollTarget: { path: string; line: number } | null = null,
    lineNumbers = false,
    frontmatterCollapsedByDefault = false,
    wordWrap = true,
  ) =>
    render(
      <Provider>
        <Hydrate
          pendingScrollTarget={pendingScrollTarget}
          lineNumbers={lineNumbers}
          frontmatterCollapsedByDefault={frontmatterCollapsedByDefault}
          wordWrap={wordWrap}
        >
          <MarkdownEditor value={value} onChange={mockOnChange} {...props} />
          <ActiveEditorObserver />
        </Hydrate>
      </Provider>,
    );

  const waitForEditor = (container: HTMLElement) =>
    waitFor(
      () => expect(container.querySelector(".cm-content")).toBeInTheDocument(),
      { timeout: 10_000 },
    );

  it("mounts a CodeMirror 6 editor", async () => {
    const { container } = renderEditor("hello world");
    await waitForEditor(container);
  });

  it("updates line wrapping and viewport containment when toggled", async () => {
    const { container } = render(
      <Provider>
        <Hydrate pendingScrollTarget={null} wordWrap>
          <MarkdownEditor value="" onChange={mockOnChange} />
          <WordWrapToggle />
        </Hydrate>
      </Provider>,
    );
    await waitForEditor(container);
    const sheet = container.querySelector<HTMLElement>(".editor-sheet");
    expect(sheet).toHaveClass("w-full");
    expect(sheet?.style.maxWidth).toBe("");
    expect(getView(container).contentDOM).toHaveClass("cm-lineWrapping");
    expect(container.querySelector("#md-editor")).not.toHaveClass("editor-no-wrap-viewport");

    fireEvent.click(screen.getByRole("button", { name: "Toggle word wrap" }));
    await waitFor(() =>
      expect(getView(container).contentDOM).not.toHaveClass("cm-lineWrapping"),
    );
    expect(sheet).toHaveClass("w-full");
    expect(container.querySelector("#md-editor")).toHaveClass("editor-no-wrap-viewport");

    fireEvent.click(screen.getByRole("button", { name: "Toggle word wrap" }));
    await waitFor(() =>
      expect(getView(container).contentDOM).toHaveClass("cm-lineWrapping"),
    );
    expect(sheet).toHaveClass("w-full");
    expect(container.querySelector("#md-editor")).not.toHaveClass("editor-no-wrap-viewport");
  });

  it("registers the asynchronously created active editor view", async () => {
    const { container } = renderEditor("# Active heading", { isActivePane: true });
    await waitForEditor(container);

    await waitFor(() => expect(screen.getByTestId("active-editor-state")).toHaveTextContent("registered"));
  });

  it("focuses a queued task line after opening a file with frontmatter", async () => {
    const { container } = renderEditor(
      "---\ntitle: Note\n---\nFirst line\n- [ ] Target task",
      { filePath: "note.md" },
      { path: "note.md", line: 4 },
    );
    await waitForEditor(container);

    await waitFor(() => {
      const view = getView(container);
      expect(view.state.selection.main.head).toBe(view.state.doc.line(4).from);
    });
  });

  it("shows the initial value in the editor", async () => {
    const { container } = renderEditor("hello world");
    await waitForEditor(container);
    expect(container.querySelector(".cm-content")?.textContent).toContain("hello world");
  });

  it("shows line numbers for each editor line", async () => {
    const { container } = renderEditor("first\nsecond\nthird", {}, null, true);
    await waitForEditor(container);
    const lineNumbers = Array.from(container.querySelectorAll("#md-editor .cm-lineNumbers .cm-gutterElement"));

    expect(lineNumbers.slice(-3).map((lineNumber) => lineNumber.textContent)).toEqual(["1", "2", "3"]);
  });

  it("shows the placeholder text when empty", async () => {
    const { container } = renderEditor("", { placeholder: "Type / for templates" });
    await waitForEditor(container);
    expect(screen.getByText("Type / for templates")).toBeInTheDocument();
  });

  it("includes a Mermaid template in the slash menu list", () => {
    expect(TEMPLATES.map((template) => template.label)).toContain("Mermaid");
  });

  it("defines the Code template as an empty fenced block with a language cursor", () => {
    const codeTemplate = TEMPLATES.find((template) => template.label === "Code");
    expect(codeTemplate?.content).toBe(CODE_BLOCK_TEMPLATE_CONTENT);
    expect(codeTemplate?.content).toContain(`\x60\x60\x60${CURSOR_SENTINEL}`);
    expect(codeTemplate?.content).toContain("\n\n```");
  });

  it("keeps frontmatter in the editable CM6 document", async () => {
    const value = "---\ntitle: Test\n---\nBody content";
    const { container } = renderEditor(value);
    await waitForEditor(container);
    const view = getView(container);
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    const cmText = container.querySelector(".cm-content")?.textContent ?? "";

    expect(cmText).toContain("title: Test");
    expect(cmText).toContain("Body content");
    expect(range).not.toBeNull();
    expect(isFrontmatterFolded(view.state, range!)).toBe(false);
  });

  it("folds frontmatter when a file opens and the preference is enabled", async () => {
    const coordsSpy = vi.spyOn(EditorView.prototype, "coordsAtPos").mockReturnValue({
      left: 0,
      right: 0,
      top: 0,
      bottom: 16,
    });
    const value = "---\ntitle: Test\n---\nBody content";
    const { container } = renderEditor(value, { filePath: "note.md" }, null, false, true);
    await waitForEditor(container);

    await waitFor(() => {
      const view = getView(container);
      const range = findFrontmatterFoldRange(view.state.doc.toString());
      expect(range).not.toBeNull();
      expect(isFrontmatterFolded(view.state, range!)).toBe(true);
      expect(screen.getByLabelText("Expand metadata")).toHaveTextContent("Metadata");
    });

    fireEvent.click(screen.getByLabelText("Expand metadata"));

    await waitFor(() => {
      const view = getView(container);
      const range = findFrontmatterFoldRange(view.state.doc.toString());
      expect(range).not.toBeNull();
      expect(isFrontmatterFolded(view.state, range!)).toBe(false);
    });
    expect(await screen.findByLabelText("Collapse frontmatter")).toBeInTheDocument();
    coordsSpy.mockRestore();
  });

  it("inserts frontmatter from the quick command when metadata is absent", async () => {
    const { container } = renderEditor("Body", { filePath: "note.md", isActivePane: true });
    await waitForEditor(container);

    act(() => {
      document.dispatchEvent(new CustomEvent("hermes:insert-template", {
        detail: { label: "Frontmatter" },
      }));
    });

    const view = getView(container);
    expect(view.state.doc.toString()).toBe(
      "---\ntitle: \ntags: []\n---\n\nBody",
    );
    expect(view.state.selection.main.head).toBe("title: ".length + 4);
  });

  it("reveals existing frontmatter from the quick command", async () => {
    const value = "---\ntitle: Test\n---\nBody";
    const { container } = renderEditor(
      value,
      { filePath: "note.md", isActivePane: true },
      null,
      false,
      true,
    );
    await waitForEditor(container);
    const view = getView(container);
    const range = findFrontmatterFoldRange(value)!;
    await waitFor(() => expect(isFrontmatterFolded(view.state, range)).toBe(true));

    act(() => {
      document.dispatchEvent(new CustomEvent("hermes:insert-template", {
        detail: { label: "Frontmatter" },
      }));
    });

    expect(isFrontmatterFolded(view.state, range)).toBe(false);
    expect(view.state.selection.main.head).toBe(view.state.doc.line(2).to);
  });

  it("calls onChange with the full value (frontmatter + body) when the doc changes", async () => {
    const { container } = renderEditor("hello");
    await waitForEditor(container);
    const view = getView(container);

    act(() => {
      view.dispatch({ changes: { from: 5, to: 5, insert: " world" } });
    });

    expect(mockOnChange).toHaveBeenCalledWith("hello world");
  });

  it("keeps frontmatter editable when the body changes", async () => {
    const value = "---\ntitle: Test\n---\nBody";
    const { container } = renderEditor(value);
    await waitForEditor(container);
    const view = getView(container);

    act(() => {
      const bodyEnd = value.length;
      view.dispatch({ changes: { from: bodyEnd, to: bodyEnd, insert: "!" } });
    });

    expect(mockOnChange).toHaveBeenCalledWith("---\ntitle: Test\n---\nBody!");
  });

  it("supports undo via CM6's native history", async () => {
    const { container } = renderEditor("hello");
    await waitForEditor(container);
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

  it("re-syncs the CM6 doc when the value prop changes externally", async () => {
    const { container, rerender } = renderEditor("first");
    await waitForEditor(container);
    rerender(
      <Provider>
        <MarkdownEditor value="second" onChange={mockOnChange} />
      </Provider>,
    );
    await waitFor(() => expect(container.querySelector(".cm-content")?.textContent).toContain("second"));
  });
});
