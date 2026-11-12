"use client";

import { useEffect } from "react";
import { useAtomValue } from "jotai";
import { atom_typewriterSound } from "@/app/atoms/ui-atoms";
import { createTypewriterSound, typewriterKind } from "@/app/utils/typewriter-sound";

// A typewriter click for each key typed in the note (Settings → Editor →
// Writing, or the palette's Enable/Disable Typewriter Sound). Headless,
// mounted once in EditorShell: while the setting is on it listens for
// keydowns whose target is the editor's text, so typing in a dialog or the
// search field stays quiet. Nothing audio-related is made until the first key.
export default function TypewriterSound() {
  const enabled = useAtomValue(atom_typewriterSound);

  useEffect(() => {
    if (!enabled) return;
    const sound = createTypewriterSound();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && event.key !== "Backspace" && event.key !== "Delete") return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".cm-content")) return;
      const kind = typewriterKind(event);
      if (kind) sound.play(kind);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      sound.close();
    };
  }, [enabled]);

  return null;
}
