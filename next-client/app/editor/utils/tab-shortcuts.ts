export type ShortcutEvent = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

export function isNewFileShortcut(event: ShortcutEvent) {
  return event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === "n";
}

// Ctrl+Alt+J on every OS (⌃⌥J on Mac): Quick jot. On Mac, Option turns `key`
// into "∆", so `code` is checked there; elsewhere `key` only, so AltGr+J
// characters (Ctrl+Alt on Windows layouts) still type.
export function isQuickJotShortcut(event: ShortcutEvent & Pick<KeyboardEvent, "code">, mac: boolean) {
  if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return false;
  return event.key.toLowerCase() === "j" || (mac && event.code === "KeyJ");
}

export function quickJotShortcutLabel(mac: boolean) {
  return mac ? "⌃⌥J" : "Ctrl+Alt+J";
}

export function isCloseTabShortcut(event: ShortcutEvent) {
  return (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "w";
}
