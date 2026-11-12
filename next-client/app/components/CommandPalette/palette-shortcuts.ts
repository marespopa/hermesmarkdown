// A JetBrains-style double-Shift gesture for opening the command palette:
// tap Shift (alone, and briefly), then press it again within DOUBLE_SHIFT_MS,
// and the palette opens exactly as with Ctrl/Cmd+P (never command mode).
// The tracker is pure: it only decides when `onOpen` fires, and never calls
// preventDefault or stopPropagation, so Shift keeps doing everything else
// it does (capitals, selection, Shift+Tab).
export const DOUBLE_SHIFT_MS = 500;

export function createDoubleShiftTracker(onOpen: () => void, now: () => number = () => performance.now()) {
  // The clock time of the lone-Shift keyup that armed the gesture; null when disarmed.
  let armedAt: number | null = null;
  // When the Shift now held went down, while nothing else has been pressed
  // with it; null once it has (a capital, a Shift+arrow selection) or after a
  // repeat. Only a Shift tapped alone and briefly arms the gesture: typing
  // Shift+key and then Shift again for the next capital must not open the
  // palette.
  let tapDownAt: number | null = null;
  const disarm = () => {
    armedAt = null;
  };

  return {
    keydown(e: KeyboardEvent) {
      if (e.isComposing) return;
      if (e.key !== "Shift") {
        // Any other key — letters, or modifier keys of another chord — breaks
        // the gesture, and the Shift held with it is no longer a tap.
        disarm();
        tapDownAt = null;
        return;
      }
      // A held key repeats its keydowns, and Shift pressed with other
      // modifiers belongs to another shortcut: neither counts.
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) {
        disarm();
        tapDownAt = null;
        return;
      }
      if (armedAt !== null && now() - armedAt <= DOUBLE_SHIFT_MS) {
        disarm();
        tapDownAt = null;
        onOpen();
        return;
      }
      tapDownAt = now();
    },
    keyup(e: KeyboardEvent) {
      if (e.isComposing) return;
      if (e.key !== "Shift") return;
      // Arming on keyup, not keydown, confirms the first Shift was released
      // cleanly before the second press — and only when it was a tap: alone
      // (no key pressed while it was down) and brief (a Shift held to click or
      // drag a selection isn't one).
      const tapped = tapDownAt !== null && now() - tapDownAt <= DOUBLE_SHIFT_MS;
      tapDownAt = null;
      if (tapped && !e.ctrlKey && !e.metaKey && !e.altKey) armedAt = now();
    },
  };
}
