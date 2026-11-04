import { describe, expect, it, vi } from "vitest";
import { createDoubleShiftTracker, DOUBLE_SHIFT_MS } from "./palette-shortcuts";

const keyEvent = (type: "keydown" | "keyup", init: KeyboardEventInit = {}) =>
  new KeyboardEvent(type, { key: "Shift", ...init });

// A mutable clock, so tests can move time forward without fake timers.
function createClock() {
  const clock = { now: 0 };
  return { clock, tick: (ms: number) => { clock.now += ms; } };
}

function setup() {
  const onOpen = vi.fn();
  const { clock, tick } = createClock();
  const tracker = createDoubleShiftTracker(onOpen, () => clock.now);
  const press = (init: KeyboardEventInit = {}) => {
    tracker.keydown(keyEvent("keydown", init));
    tracker.keyup(keyEvent("keyup", init));
  };
  return { onOpen, tick, tracker, press };
}

describe("the double-Shift palette gesture", () => {
  it("opens the palette when Shift is pressed twice quickly", () => {
    const { onOpen, press } = setup();
    press();
    press();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("does not open when the second press comes more than 500ms later", () => {
    const { onOpen, press, tick } = setup();
    press();
    tick(DOUBLE_SHIFT_MS + 1);
    press();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open when the first Shift was never released", () => {
    const { onOpen, tracker } = setup();
    tracker.keydown(keyEvent("keydown"));
    tracker.keydown(keyEvent("keydown"));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open when another key sits between the two presses", () => {
    const { onOpen, press, tracker } = setup();
    press();
    tracker.keydown(keyEvent("keydown", { key: "a" }));
    press();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("ignores a held Shift (its repeated keydowns)", () => {
    const { onOpen, press, tracker } = setup();
    press();
    // The OS repeats the keydown while the key is held, then the second press.
    tracker.keydown(keyEvent("keydown", { repeat: true }));
    press();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open when Shift is held with Ctrl (that is another shortcut's chord)", () => {
    const { onOpen, press } = setup();
    press({ ctrlKey: true });
    press({ ctrlKey: true });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("ignores IME composition", () => {
    const { onOpen, press } = setup();
    press({ isComposing: true });
    press({ isComposing: true });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
