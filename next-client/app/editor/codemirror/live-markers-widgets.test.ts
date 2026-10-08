import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { HiOutlineLightBulb } from "react-icons/hi";
import { describe, expect, it } from "vitest";
import { CalloutLabelWidget, TaskBoxWidget } from "./live-markers-widgets";

const view = () => new EditorView({ state: EditorState.create({ doc: "- [ ] task" }) });

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
});

describe("CalloutLabelWidget", () => {
  it("shows the type's icon before its name", () => {
    const dom = new CalloutLabelWidget("tip", "text-emerald-600", HiOutlineLightBulb).toDOM(view());
    expect(dom.querySelector(".cm-calloutIcon svg")).not.toBeNull();
    expect(dom.textContent).toBe("tip");
  });
});
