// A JetBrains-style double-Shift gesture for opening the command palette:
// press and release Shift, then press it again within DOUBLE_SHIFT_MS, and
// the palette opens exactly as with Ctrl/Cmd+P (never command mode).
// The tracker is pure: it only decides when `onOpen` fires, and never calls
// preventDefault or stopPropagation, so Shift keeps doing everything else
// it does (capitals, selection, Shift+Tab).
export const DOUBLE_SHIFT_MS = 500;

export function createDoubleShiftTracker(onOpen: () => void, now: () => number = () => performance.now()) {
  // The clock time of the lone-Shift keyup that armed the gesture; null when disarmed.
  let armedAt: number | null = null;
  const disarm = () => {
    armedAt = null;
  };

  return {
    keydown(e: KeyboardEvent) {
      if (e.isComposing) return;
      if (e.key !== "Shift") {
        // Any other key — letters, or modifier keys of another chord — breaks the gesture.
        disarm();
        return;
      }
      // A held key repeats its keydowns, and Shift pressed with other
      // modifiers belongs to another shortcut: neither counts.
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) {
        disarm();
        return;
      }
      if (armedAt !== null && now() - armedAt <= DOUBLE_SHIFT_MS) {
        disarm();
        onOpen();
      }
    },
    keyup(e: KeyboardEvent) {
      if (e.isComposing) return;
      // Arming on keyup, not keydown, confirms the first Shift was released
      // cleanly before the second press — and only when it was lone.
      if (e.key === "Shift" && !e.ctrlKey && !e.metaKey && !e.altKey) armedAt = now();
    },
  };
}
