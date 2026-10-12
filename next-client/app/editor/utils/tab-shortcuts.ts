export type ShortcutEvent = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

export function isNewFileShortcut(event: ShortcutEvent) {
  return event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === "n";
}

export function isCloseTabShortcut(event: ShortcutEvent) {
  return (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "w";
}
