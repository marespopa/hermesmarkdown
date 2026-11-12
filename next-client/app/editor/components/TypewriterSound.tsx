"use client";

import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { atom_typewriterSound } from "@/app/atoms/ui-atoms";
import { createTypewriterSound, typewriterInputKind, typewriterKeyNamed, typewriterKind } from "@/app/utils/typewriter-sound";

// A typewriter click for each key typed in the note (Settings → Editor →
// Writing, or the palette's Enable/Disable Typewriter Sound). Headless,
// mounted once in EditorShell: while the setting is on it listens for typing
// whose target is the editor's text, so typing in a dialog or the search
// field stays quiet. Nothing audio-related is made until the first key.
//
// Two events, one click: a keydown that names its key (a hardware keyboard)
// is heard there, since the editor's keymap cancels the input of Enter and
// Backspace. An on-screen keyboard sends unnamed keydowns, or none at all
// when swiping, so its typing is heard from `beforeinput`.
const SAME_KEY_MS = 50;

export default function TypewriterSound() {
  const enabled = useAtomValue(atom_typewriterSound);

  useEffect(() => {
    if (!enabled) return;
    const sound = createTypewriterSound();
    // When the last named keydown came, and the composition's text so far.
    let namedAt = -Infinity;
    let composing = "";
    const inEditor = (event: Event) => event.target instanceof Element && !!event.target.closest(".cm-content");
    const onKeyDown = (event: KeyboardEvent) => {
      if (!inEditor(event) || !typewriterKeyNamed(event)) return;
      namedAt = performance.now();
      if (event.repeat && event.key !== "Backspace" && event.key !== "Delete") return;
      const kind = typewriterKind(event);
      if (kind) sound.play(kind);
    };
    const onBeforeInput = (event: InputEvent) => {
      if (!inEditor(event)) return;
      const kind = typewriterInputKind(event, composing);
      if (event.inputType === "insertCompositionText") composing = event.data ?? "";
      // The keydown just before already spoke (or chose silence) for this key.
      if (performance.now() - namedAt < SAME_KEY_MS) return;
      if (kind) sound.play(kind);
    };
    const onCompositionEnd = () => {
      composing = "";
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("beforeinput", onBeforeInput);
    document.addEventListener("compositionend", onCompositionEnd);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("beforeinput", onBeforeInput);
      document.removeEventListener("compositionend", onCompositionEnd);
      sound.close();
    };
  }, [enabled]);

  return null;
}
