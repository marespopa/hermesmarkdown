import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROLLUP_END, ROLLUP_START } from "@/app/utils/rollup/render";
import { ROLLUP_ITEM_EVENT, type RollupItemRequest } from "../utils/worklog-events";
import { setRollupContext, type RollupContext } from "./rollup-context";
import { rollupView } from "./rollup-view";

const OPEN_ITEM = "- Draft roadmap #planning · [[2026-10-06]]";
const DOC = [
  "# Week 41",
  "",
  ROLLUP_START,
  "1 done · 1 open · 1 blocked",
  "",
  "## Done",
  "",
  "### Other",
  "- Fix login redirect · [[2026-10-05]]",
  "",
  "## Blocked",
  "- Vendor contract #blocked · [[2026-10-07]]",
  "",
  "## Still open",
  OPEN_ITEM,
  ROLLUP_END,
  "",
  "## Notes",
  "",
  "- Not an item · [[2026-10-06]]",
].join("\n");

const context = (overrides: Partial<RollupContext> = {}): RollupContext => ({
  path: "2026-W41.md",
  kind: "week",
  caption: "From your daily sheets",
  fresh: new Set(),
  ...overrides,
});

describe("rollupView", () => {
  let view: EditorView | null = null;
  const mount = (ctx: RollupContext | null) => {
    view = new EditorView({ state: EditorState.create({ doc: DOC, extensions: [rollupView] }), parent: document.body });
    view.dispatch({ effects: setRollupContext.of(ctx) });
    return view;
  };
  afterEach(() => {
    view?.destroy();
    view = null;
  });

  it("leaves a note without rollup context as written", () => {
    const editor = mount(null);
    expect(editor.contentDOM.querySelector(".cm-rollupStats")).toBeNull();
    expect(editor.contentDOM.querySelectorAll(".cm-rollupCheck")).toHaveLength(0);
  });

  it("shows the summary as a stat strip with a done bar", () => {
    const editor = mount(context());
    const strip = editor.contentDOM.querySelector(".cm-rollupStats");
    expect(strip?.getAttribute("aria-label")).toBe("1 done, 1 open, 1 blocked");
    expect((strip?.querySelector(".cm-rollupBarFill") as HTMLElement).style.width).toBe("33%");
  });

  it("puts a checkbox on Blocked and Still open items only, inside the generated part", () => {
    const editor = mount(context());
    const boxes = [...editor.contentDOM.querySelectorAll(".cm-rollupCheck")];
    expect(boxes.map((box) => box.getAttribute("aria-label"))).toEqual(["Mark done in 2026-10-07", "Mark done in 2026-10-06"]);
  });

  it("asks to check the task off when its box is pressed", () => {
    const editor = mount(context());
    const handler = vi.fn();
    document.addEventListener(ROLLUP_ITEM_EVENT, handler);
    const box = editor.contentDOM.querySelectorAll(".cm-rollupCheck")[1];
    box.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    document.removeEventListener(ROLLUP_ITEM_EVENT, handler);
    expect((handler.mock.calls[0][0] as CustomEvent<RollupItemRequest>).detail).toEqual({ path: "2026-W41.md", line: OPEN_ITEM, action: "toggle" });
    expect(box.getAttribute("aria-checked")).toBe("true");
  });

  it("tints the item lines the last rebuild added", () => {
    const editor = mount(context({ fresh: new Set([OPEN_ITEM]) }));
    const tinted = [...editor.contentDOM.querySelectorAll(".cm-rollupFresh")];
    expect(tinted).toHaveLength(1);
    expect(tinted[0].textContent).toContain("Draft roadmap");
  });
});
