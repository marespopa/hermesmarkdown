import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { atom_typewriterLevel, atom_typewriterSound } from "@/app/atoms/ui-atoms";
import TypewriterSound from "./TypewriterSound";

const sound = vi.hoisted(() => ({ play: vi.fn(), close: vi.fn(), setVolume: vi.fn() }));

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

const input = (target: Element, inputType: string, data: string | null = null) =>
  fireEvent(target, new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType, data }));
// What an on-screen keyboard sends before each `beforeinput`.
const unnamedKey = (target: Element) => fireEvent.keyDown(target, { key: "Unidentified", keyCode: 229 });

describe("TypewriterSound", () => {
  afterEach(() => {
    sound.play.mockClear();
    sound.close.mockClear();
    sound.setVolume.mockClear();
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

  it("clicks for an on-screen keyboard, whose keys arrive as input and not as named keydowns", () => {
    const { editor, field } = setup(true);
    unnamedKey(editor);
    input(editor, "insertCompositionText", "t");
    unnamedKey(editor);
    input(editor, "insertCompositionText", "ta");
    unnamedKey(editor);
    input(editor, "insertCompositionText", "t");
    // The commit at the end of the word repeats its text: no second click.
    input(editor, "insertCompositionText", "t");
    fireEvent.compositionEnd(editor);
    input(editor, "insertText", " ");
    // A new word starts short; that isn't a delete.
    input(editor, "insertCompositionText", "s");
    fireEvent.compositionEnd(editor);
    input(editor, "deleteContentBackward");
    input(editor, "insertParagraph");
    input(editor, "insertFromPaste", "pasted");
    input(field, "insertText", "a");
    expect(sound.play.mock.calls.map(([kind]) => kind)).toEqual(["key", "key", "back", "space", "key", "back", "return"]);
  });

  it("clicks once for a hardware key, which sends a keydown and then its input", () => {
    const { editor } = setup(true);
    fireEvent.keyDown(editor, { key: "a" });
    input(editor, "insertText", "a");
    // A held key repeats: its keydown is silent, and so is the input after it.
    fireEvent.keyDown(editor, { key: "a", repeat: true });
    input(editor, "insertText", "a");
    fireEvent.keyDown(editor, { key: "x", ctrlKey: true });
    input(editor, "deleteByCut");
    expect(sound.play.mock.calls.map(([kind]) => kind)).toEqual(["key"]);
  });

  it("plays at the chosen volume, and changes it without starting over", () => {
    const { store } = setup(true);
    React.act(() => store.set(atom_typewriterLevel, "quiet"));
    expect(sound.setVolume).toHaveBeenLastCalledWith("quiet");
    React.act(() => store.set(atom_typewriterLevel, "loud"));
    expect(sound.setVolume).toHaveBeenLastCalledWith("loud");
    expect(sound.close).not.toHaveBeenCalled();

    // Off and on again: the volume last chosen.
    React.act(() => store.set(atom_typewriterLevel, "off"));
    expect(sound.close).toHaveBeenCalled();
    React.act(() => store.set(atom_typewriterSound, true));
    expect(store.get(atom_typewriterLevel)).toBe("loud");
    expect(sound.setVolume).toHaveBeenLastCalledWith("loud");
  });
});
