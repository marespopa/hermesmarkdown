import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CHROME_FADED_ATTRIBUTE, EDGE_REVEAL_ZONE, REVEAL_DISTANCE, REVEAL_PAUSE, useFadeChromeWhileTyping } from "./use-fade-chrome-while-typing";

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
// Over the text by default, well clear of the top and left edges.
const moveMouse = (distance: number, at = { x: 400, y: 300 }, timeStamp = 0) => {
  const event = new MouseEvent("mousemove", { bubbles: true, clientX: at.x, clientY: at.y });
  Object.defineProperty(event, "movementX", { value: distance });
  Object.defineProperty(event, "movementY", { value: 0 });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
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

  it("brings it back once the mouse has moved far enough, anywhere", () => {
    const { content } = mountEditor();
    renderHook(() => useFadeChromeWhileTyping(true));
    type(content);
    moveMouse(REVEAL_DISTANCE - 1, undefined, 1000);
    expect(isFaded()).toBe(true);
    moveMouse(1, undefined, 1010);
    expect(isFaded()).toBe(false);
  });

  it("ignores small movements spread out over time", () => {
    const { content } = mountEditor();
    renderHook(() => useFadeChromeWhileTyping(true));
    type(content);
    for (let i = 0; i < 10; i++) moveMouse(REVEAL_DISTANCE - 1, undefined, 1000 + i * (REVEAL_PAUSE + 1));
    expect(isFaded()).toBe(true);
  });

  it("brings it back at once near the top or left edge", () => {
    const { content } = mountEditor();
    renderHook(() => useFadeChromeWhileTyping(true));
    type(content);
    moveMouse(1, { x: 400, y: EDGE_REVEAL_ZONE - 1 }, 1000);
    expect(isFaded()).toBe(false);

    type(content);
    moveMouse(1, { x: EDGE_REVEAL_ZONE - 1, y: 300 }, 2000);
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
