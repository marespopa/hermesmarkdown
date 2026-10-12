export type ShortcutEvent = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

export function isNewFileShortcut(event: ShortcutEvent) {
  return event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === "n";
}

// Quick jot: ⌘J on Mac, Ctrl+Alt+J elsewhere. Elsewhere `key` only is
// checked, so AltGr+J characters (Ctrl+Alt on Windows layouts) still type.
export function isQuickJotShortcut(event: ShortcutEvent & Pick<KeyboardEvent, "code">, mac: boolean) {
  if (mac) {
    if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
    return event.key.toLowerCase() === "j" || event.code === "KeyJ";
  }
  if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return false;
  return event.key.toLowerCase() === "j";
}

export function quickJotShortcutLabel(mac: boolean) {
  return mac ? "⌘J" : "Ctrl+Alt+J";
}

export function isCloseTabShortcut(event: ShortcutEvent) {
  return (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "w";
}
