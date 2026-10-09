import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CHROME_FADED_ATTRIBUTE, REVEAL_DISTANCE, useFadeChromeWhileTyping } from "./use-fade-chrome-while-typing";

const isFaded = () => document.documentElement.hasAttribute(CHROME_FADED_ATTRIBUTE);

function mountEditor() {
  const editor = document.createElement("div");
  editor.className = "cm-editor";
  const content = document.createElement("div");
  content.className = "cm-content";
  editor.append(content);
  const outside = document.createElement("button");
  document.body.append(editor, outside);
  return { content, outside };
}

const type = (target: Element) => target.dispatchEvent(new Event("beforeinput", { bubbles: true }));
const moveMouse = (distance: number) => {
  const event = new MouseEvent("mousemove", { bubbles: true });
  Object.defineProperty(event, "movementX", { value: distance });
  Object.defineProperty(event, "movementY", { value: 0 });
  document.dispatchEvent(event);
};

describe("useFadeChromeWhileTyping", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute(CHROME_FADED_ATTRIBUTE);
  });

  it("fades the chrome on typing in the editor, not elsewhere", () => {
    const { content, outside } = mountEditor();
    renderHook(() => useFadeChromeWhileTyping(true));
    type(outside);
    expect(isFaded()).toBe(false);
    type(content);
    expect(isFaded()).toBe(true);
  });

  it("brings it back once the mouse has moved far enough", () => {
    const { content } = mountEditor();
    renderHook(() => useFadeChromeWhileTyping(true));
    type(content);
    moveMouse(REVEAL_DISTANCE - 1);
    expect(isFaded()).toBe(true);
    moveMouse(1);
    expect(isFaded()).toBe(false);
  });

  it("brings it back on a tap or focus outside the editor", () => {
    const { content, outside } = mountEditor();
    renderHook(() => useFadeChromeWhileTyping(true));
    type(content);
    content.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(isFaded()).toBe(true);
    outside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(isFaded()).toBe(false);

    type(content);
    outside.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(isFaded()).toBe(false);
  });

  it("does nothing when off, and clears the state when turned off", () => {
    const { content } = mountEditor();
    const { rerender } = renderHook(({ on }) => useFadeChromeWhileTyping(on), { initialProps: { on: false } });
    type(content);
    expect(isFaded()).toBe(false);
    rerender({ on: true });
    type(content);
    expect(isFaded()).toBe(true);
    rerender({ on: false });
    expect(isFaded()).toBe(false);
  });
});
