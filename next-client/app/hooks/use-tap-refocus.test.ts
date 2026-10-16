import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import useTapRefocus from "./use-tap-refocus";

function pointer(type: "pointerdown" | "click", target: Element, pointerType = "touch") {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
}

describe("useTapRefocus", () => {
  let field: HTMLInputElement;
  let onBlur: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    field = document.createElement("input");
    field.value = "Roadmap";
    document.body.appendChild(field);
    onBlur = vi.fn();
    document.addEventListener("focusout", onBlur);
  });

  afterEach(() => {
    document.removeEventListener("focusout", onBlur);
    field.remove();
  });

  it("refocuses a script-focused field on the first touch tap, without a blur reaching the app", () => {
    renderHook(() => useTapRefocus());
    field.focus();
    field.setSelectionRange(2, 4);
    const blurSpy = vi.spyOn(field, "blur");

    pointer("pointerdown", field);
    pointer("click", field);

    expect(blurSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([2, 4]);
    expect(onBlur).not.toHaveBeenCalled();
  });

  it("refocuses only once", () => {
    renderHook(() => useTapRefocus());
    field.focus();
    const blurSpy = vi.spyOn(field, "blur");

    pointer("click", field);
    pointer("click", field);

    expect(blurSpy).toHaveBeenCalledTimes(1);
  });

  it("leaves a field focused by a touch alone", () => {
    renderHook(() => useTapRefocus());
    pointer("pointerdown", field);
    field.focus();
    const blurSpy = vi.spyOn(field, "blur");

    pointer("click", field);

    expect(blurSpy).not.toHaveBeenCalled();
  });

  it("ignores mouse clicks", () => {
    renderHook(() => useTapRefocus());
    field.focus();
    const blurSpy = vi.spyOn(field, "blur");

    pointer("click", field, "mouse");

    expect(blurSpy).not.toHaveBeenCalled();
  });
});
