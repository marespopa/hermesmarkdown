import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import "@testing-library/jest-dom";
import FrontmatterHeaderMenus from "./FrontmatterHeaderMenus";
import { frontmatterHeader, setHeaderFocus } from "../../codemirror/frontmatter-header";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

let container: HTMLDivElement;
let view: EditorView;

function setup(doc: string, caret: number) {
  container = document.createElement("div");
  document.body.appendChild(container);
  view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: caret },
      extensions: [markdown({ base: markdownLanguage }), frontmatterHeader],
    }),
    parent: container,
  });
  const viewRef = { current: view };
  const containerRef = { current: container };
  render(
    <Provider>
      <FrontmatterHeaderMenus viewRef={viewRef} containerRef={containerRef} />
    </Provider>,
  );
}

const chip = (kind: string) => view.contentDOM.querySelector<HTMLElement>(`.cm-fm-chip[data-kind="${kind}"]`)!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 25));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  view.destroy();
  container.remove();
});

describe("FrontmatterHeaderMenus", () => {
  it("opens the status menu from the chip and rewrites the status", () => {
    const doc = "---\nstatus: draft\n---\nBody";
    setup(doc, doc.indexOf("Body"));
    act(() => chip("status").click());
    fireEvent.click(screen.getByText("done"));
    expect(view.state.doc.toString()).toBe("---\nstatus: done\n---\nBody");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the date picker from a date chip and writes YYYY-MM-DD", () => {
    const doc = "---\ndue_date: 2026-11-15\n---\nBody";
    setup(doc, doc.indexOf("Body"));
    act(() => chip("date").click());
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByText("20"));
    expect(view.state.doc.toString()).toBe("---\ndue_date: 2026-11-20\n---\nBody");
  });

  it("keeps the time part of a datetime", () => {
    const doc = "---\ncreated: 2026-10-24T15:14:54Z\n---\nBody";
    setup(doc, doc.indexOf("Body"));
    act(() => chip("date").click());
    fireEvent.click(screen.getByText("2"));
    expect(view.state.doc.toString()).toBe("---\ncreated: 2026-10-02T15:14:54Z\n---\nBody");
  });

  it("focuses the editor and moves a caret out of the block when it closes", () => {
    const doc = "---\nstatus: draft\n---\nBody";
    setup(doc, 0);
    act(() => view.dispatch({ effects: setHeaderFocus.of(false), selection: { anchor: doc.indexOf("draft") } }));
    act(() => {
      view.dom.dispatchEvent(new CustomEvent("hermes:frontmatter-chip", {
        bubbles: true,
        detail: { kind: "status", key: "status", value: "draft" },
      }));
    });
    fireEvent.click(screen.getByText("review"));
    expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf("Body"));
    expect(document.activeElement).toBe(view.contentDOM);
  });
});
