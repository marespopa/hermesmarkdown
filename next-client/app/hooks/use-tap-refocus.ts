import { useEffect } from "react";

const TEXT_FIELD = "textarea, input:not([type]), input[type='text'], input[type='search'], input[type='email'], input[type='url'], input[type='tel'], input[type='password'], input[type='number']";
const FOCUS_EVENTS = ["focusout", "blur", "focusin", "focus"] as const;

function textField(target: EventTarget | null) {
  const element = (target as Element | null)?.closest?.(TEXT_FIELD);
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element : null;
}

// Blurs and refocuses `field` with no focus event reaching the app: a window
// capture listener runs before React's root listener and every other
// handler, so blur-to-save fields (inline rename, the start name) don't
// commit and fading/scroll handlers don't run.
function refocusSilently(field: HTMLInputElement | HTMLTextAreaElement) {
  const stop = (event: Event) => event.stopImmediatePropagation();
  for (const type of FOCUS_EVENTS) window.addEventListener(type, stop, true);
  let selection: [number | null, number | null, "forward" | "backward" | "none" | null] | null = null;
  try { selection = [field.selectionStart, field.selectionEnd, field.selectionDirection]; } catch { /* type without selection */ }
  try {
    field.blur();
    field.focus({ preventScroll: true });
    if (selection && selection[0] !== null && selection[1] !== null) {
      field.setSelectionRange(selection[0], selection[1], selection[2] ?? undefined);
    }
  } catch { /* type without selection */ }
  finally {
    for (const type of FOCUS_EVENTS) window.removeEventListener(type, stop, true);
  }
}

// Android Chrome doesn't attach the on-screen keyboard to a field that
// script focused (a dialog's first field, the palette, autoFocus): the
// keyboard shows, but typing does nothing until the field loses focus and
// gets it back. So the first tap on such a field refocuses it within the
// tap, which connects the keyboard. Fields focused by a touch are left alone.
export default function useTapRefocus() {
  useEffect(() => {
    const scriptFocused = new WeakSet<Element>();
    let touchedField: Element | null = null;

    const onPointerDown = (event: PointerEvent) => {
      touchedField = event.pointerType === "touch" ? textField(event.target) : null;
    };
    const onFocusIn = (event: FocusEvent) => {
      const field = textField(event.target);
      if (field && field !== touchedField) scriptFocused.add(field);
      touchedField = null;
    };
    const onFocusOut = (event: FocusEvent) => {
      const field = textField(event.target);
      if (field) scriptFocused.delete(field);
    };
    const onClick = (event: MouseEvent) => {
      if ((event as PointerEvent).pointerType !== "touch") return;
      const field = textField(event.target);
      if (!field || field !== document.activeElement || !scriptFocused.has(field)) return;
      scriptFocused.delete(field);
      refocusSilently(field);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}
