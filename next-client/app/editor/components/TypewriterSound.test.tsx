import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { atom_typewriterSound } from "@/app/atoms/ui-atoms";
import TypewriterSound from "./TypewriterSound";

const sound = vi.hoisted(() => ({ play: vi.fn(), close: vi.fn() }));

vi.mock("@/app/utils/typewriter-sound", async () => {
  const actual = await vi.importActual<typeof import("@/app/utils/typewriter-sound")>("@/app/utils/typewriter-sound");
  return { ...actual, createTypewriterSound: () => sound };
});

function setup(enabled?: boolean) {
  const store = createStore();
  if (enabled !== undefined) store.set(atom_typewriterSound, enabled);
  const view = render(<Provider store={store}><TypewriterSound /></Provider>);
  const editor = document.createElement("div");
  editor.className = "cm-content";
  document.body.appendChild(editor);
  const field = document.createElement("input");
  document.body.appendChild(field);
  return { store, view, editor, field };
}

describe("TypewriterSound", () => {
  afterEach(() => {
    sound.play.mockClear();
    sound.close.mockClear();
    document.body.innerHTML = "";
  });

  it("clicks for keys typed in the editor, by default", () => {
    const { editor } = setup();
    fireEvent.keyDown(editor, { key: "a" });
    fireEvent.keyDown(editor, { key: "Enter" });
    expect(sound.play.mock.calls.map(([kind]) => kind)).toEqual(["key", "return"]);
  });

  it("is silent for shortcuts and for typing outside the editor", () => {
    const { editor, field } = setup();
    fireEvent.keyDown(editor, { key: "s", ctrlKey: true });
    fireEvent.keyDown(editor, { key: "ArrowLeft" });
    fireEvent.keyDown(field, { key: "a" });
    expect(sound.play).not.toHaveBeenCalled();
  });

  it("does nothing while the setting is off, and stops when it is turned off", () => {
    const off = setup(false);
    fireEvent.keyDown(off.editor, { key: "a" });
    expect(sound.play).not.toHaveBeenCalled();
    off.view.unmount();

    const on = setup(true);
    fireEvent.keyDown(on.editor, { key: "a" });
    expect(sound.play).toHaveBeenCalledTimes(1);
    React.act(() => on.store.set(atom_typewriterSound, false));
    fireEvent.keyDown(on.editor, { key: "b" });
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(sound.close).toHaveBeenCalled();
  });

  it("ignores auto-repeat except when deleting", () => {
    // Set explicitly: the test above saved "off" to storage.
    const { editor } = setup(true);
    fireEvent.keyDown(editor, { key: "a", repeat: true });
    expect(sound.play).not.toHaveBeenCalled();
    fireEvent.keyDown(editor, { key: "Backspace", repeat: true });
    expect(sound.play).toHaveBeenCalledWith("back");
  });
});
