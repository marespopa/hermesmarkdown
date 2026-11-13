import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { paneTopMargin } from "./pane-top-margin";

const rect = (top: number) => ({ top, bottom: top + 400, left: 0, right: 300, width: 300, height: 400, x: 0, y: top, toJSON: () => ({}) });

// A pane 100px down the window, its text `textTop` px below the pane's top.
function setup(textTop: number, room: string | null = "48px") {
  const canvas = document.createElement("div");
  canvas.className = "editor-canvas";
  if (room) canvas.style.setProperty("--pane-top-room", room);
  document.body.appendChild(canvas);
  const view = new EditorView({ state: EditorState.create({ doc: "/" }), parent: canvas });
  if (room) view.dom.style.setProperty("--pane-top-room", room);
  canvas.getBoundingClientRect = () => rect(100);
  view.scrollDOM.getBoundingClientRect = () => rect(100 + textTop);
  return view;
}

describe("paneTopMargin", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("is 0 at the top of the note, where the text starts below the title, so the first lines' menus show", () => {
    expect(paneTopMargin(setup(48))).toBe(0);
    expect(paneTopMargin(setup(64))).toBe(0);
  });

  it("is the title's room once the text has scrolled under it", () => {
    expect(paneTopMargin(setup(40))).toBe(48);
    expect(paneTopMargin(setup(-900))).toBe(48);
  });

  it("is 0 where the pane keeps no room (a phone)", () => {
    expect(paneTopMargin(setup(0, null))).toBe(0);
  });
});
