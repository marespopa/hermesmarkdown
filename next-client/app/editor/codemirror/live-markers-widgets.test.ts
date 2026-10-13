import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HiOutlineLightBulb } from "react-icons/hi";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulletWidget, CalloutLabelWidget, TaskBoxWidget, toggleTaskBox } from "./live-markers-widgets";
import { CALLOUT_TYPE_MENU_EVENT } from "./callout-type";

const view = (doc = "- [ ] task") => new EditorView({ state: EditorState.create({ doc }) });

describe("BulletWidget", () => {
  it("draws its glyph without any text the caret could land in", () => {
    const top = new BulletWidget(0).toDOM();
    expect(top.textContent).toBe("");
    expect(top.dataset.glyph).toBe("•");
    expect(new BulletWidget(1).toDOM().dataset.glyph).toBe("◦");
  });
});

describe("TaskBoxWidget", () => {
  it("draws a new box without the tick animation", () => {
    const dom = new TaskBoxWidget("x").toDOM(view());
    expect(dom.dataset.state).toBe("done");
    expect(dom.classList.contains("cm-liveTask-ticked")).toBe(false);
  });

  it("plays the tick animation when an open box is ticked in place", () => {
    const dom = new TaskBoxWidget(" ").toDOM(view());
    expect(new TaskBoxWidget("x").updateDOM(dom)).toBe(true);
    expect(dom.dataset.state).toBe("done");
    expect(dom.getAttribute("aria-checked")).toBe("true");
    expect(dom.classList.contains("cm-liveTask-ticked")).toBe(true);
  });

  it("drops the animation when the box is unticked", () => {
    const dom = new TaskBoxWidget(" ").toDOM(view());
    new TaskBoxWidget("x").updateDOM(dom);
    new TaskBoxWidget(" ").updateDOM(dom);
    expect(dom.dataset.state).toBe("open");
    expect(dom.classList.contains("cm-liveTask-ticked")).toBe(false);
  });

  it("draws an on-hold box", () => {
    const dom = new TaskBoxWidget("!").toDOM(view());
    expect(dom.dataset.state).toBe("hold");
    expect(dom.getAttribute("aria-checked")).toBe("false");
  });
});

describe("toggleTaskBox", () => {
  afterEach(() => vi.useRealTimers());

  it("completes open tasks and reopens closed ones, with the done stamp", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
    for (const [box, after] of [
      [" ", "x] task @done(2026-10-12)"],
      ["/", "x] task @done(2026-10-12)"],
      ["!", "x] task @done(2026-10-12)"],
      ["x", " ] task"],
      ["-", " ] task"],
    ]) {
      const v = view(box === "x" ? "- [x] task @done(2026-10-09)" : `- [${box}] task`);
      toggleTaskBox(v, 0);
      expect(v.state.doc.toString()).toBe(`- [${after}`);
    }
  });
});

describe("CalloutLabelWidget", () => {
  it("shows the type's icon before its name", () => {
    const dom = new CalloutLabelWidget("tip", "text-emerald-600", HiOutlineLightBulb).toDOM(view());
    expect(dom.querySelector(".cm-calloutIcon svg")).not.toBeNull();
    expect(dom.textContent).toBe("tip");
  });

  it("asks for the type menu on press, under the label", () => {
    const v = view("> [!tip] Title");
    const dom = new CalloutLabelWidget("tip", "text-emerald-600", HiOutlineLightBulb).toDOM(v);
    v.contentDOM.firstChild?.appendChild(dom);
    const listener = vi.fn();
    v.dom.addEventListener(CALLOUT_TYPE_MENU_EVENT, listener);
    dom.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.pos).toBeGreaterThanOrEqual(0);
    expect(detail.anchor).toBeDefined();
    expect(dom.querySelector(".cm-calloutChevron svg")).not.toBeNull();
  });
});
