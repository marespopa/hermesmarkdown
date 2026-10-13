import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it, vi } from "vitest";
import { CALLOUT_TYPE_MENU_EVENT, calloutTypeAt, requestCalloutTypeMenu, setCalloutType } from "./callout-type";

const view = (doc: string) => new EditorView({ state: EditorState.create({ doc }) });

describe("callout type", () => {
  it("reads the type on a title line, and null elsewhere", () => {
    const v = view("> [!tip] Title\n> body\nplain");
    expect(calloutTypeAt(v, 3)).toBe("tip");
    expect(calloutTypeAt(v, v.state.doc.line(2).from)).toBeNull();
    expect(calloutTypeAt(v, v.state.doc.line(3).from)).toBeNull();
  });

  it("rewrites only the type, keeping the fold sign and the title", () => {
    const v = view("> [!note]- Release checklist\n> body");
    expect(setCalloutType(v, 5, "warning")).toBe(true);
    expect(v.state.doc.toString()).toBe("> [!warning]- Release checklist\n> body");
  });

  it("works on a nested callout", () => {
    const v = view("> > [!info] Deploy");
    setCalloutType(v, 0, "danger");
    expect(v.state.doc.toString()).toBe("> > [!danger] Deploy");
  });

  it("leaves a line that isn't a callout title alone", () => {
    const v = view("> just a quote");
    expect(setCalloutType(v, 0, "tip")).toBe(false);
    expect(v.state.doc.toString()).toBe("> just a quote");
  });

  it("asks for the menu with a bubbling event from the editor", () => {
    const v = view("> [!note]");
    const listener = vi.fn();
    document.body.appendChild(v.dom);
    document.body.addEventListener(CALLOUT_TYPE_MENU_EVENT, listener);
    requestCalloutTypeMenu(v, { pos: 3 });
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ pos: 3 });
    document.body.removeEventListener(CALLOUT_TYPE_MENU_EVENT, listener);
    v.destroy();
  });
});
