import { describe, it, expect } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { shortcodeExpandPlugin } from "./shortcode-expand";

function makeView() {
  const state = EditorState.create({ doc: "", extensions: [shortcodeExpandPlugin] });
  return new EditorView({ state });
}

// Simulates the user typing `text` at the current cursor — dispatched with
// userEvent "input.type" so the plugin's isUserEvent("input") guard fires,
// same as real keystrokes would. The plugin's own follow-up dispatch is
// deferred via queueMicrotask (see shortcode-expand.ts for why), so this
// awaits a microtask flush before returning.
async function type(view: EditorView, text: string) {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, to: pos, insert: text },
    selection: EditorSelection.cursor(pos + text.length),
    userEvent: "input.type",
  });
  await Promise.resolve();
}

describe("shortcodeExpandPlugin", () => {
  it("expands {date} to today's ISO date", async () => {
    const view = makeView();
    await type(view, "{date}");
    expect(view.state.doc.toString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("expands {time} to HH:MM", async () => {
    const view = makeView();
    await type(view, "{time}");
    expect(view.state.doc.toString()).toMatch(/^\d{2}:\d{2}$/);
  });

  it("expands ..d to today's date", async () => {
    const view = makeView();
    await type(view, "..d");
    expect(view.state.doc.toString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("evaluates a calc() expression", async () => {
    const view = makeView();
    await type(view, "calc(2+2)=");
    expect(view.state.doc.toString()).toBe("4");
  });

  it("evaluates a calc() expression with decimals, rounded to 2 places", async () => {
    const view = makeView();
    await type(view, "calc(10/3)=");
    expect(view.state.doc.toString()).toBe("3.33");
  });

  it("leaves ordinary typed text untouched", async () => {
    const view = makeView();
    await type(view, "just some text");
    expect(view.state.doc.toString()).toBe("just some text");
  });

  it("does not re-trigger on its own replacement (no infinite loop)", async () => {
    const view = makeView();
    await type(view, "..d");
    const afterFirstExpand = view.state.doc.toString();
    expect(afterFirstExpand).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Give any (incorrect) re-trigger a chance to fire before asserting
    // the document settled and didn't change again.
    await Promise.resolve();
    expect(view.state.doc.toString()).toBe(afterFirstExpand);
  });
});
