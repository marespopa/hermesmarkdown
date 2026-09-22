import { afterEach, describe, expect, it } from "vitest";
import { focusPaneEditor } from "./focus-pane-editor";

describe("focusPaneEditor", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("focuses the CodeMirror content in the selected pane only", () => {
    document.body.innerHTML = `
      <div data-pane-id="first"><div class="cm-content" tabindex="0"></div></div>
      <div data-pane-id="selected"><div class="cm-content" tabindex="0"></div></div>
    `;
    const selectedEditor = document.querySelector<HTMLElement>('[data-pane-id="selected"] .cm-content');

    focusPaneEditor("selected");

    expect(document.activeElement).toBe(selectedEditor);
  });
});
