// Shortcut-hint formatting respects the real platform — Mac gets symbol
// glyphs (⌘⇧), Windows/Linux get textual "Ctrl+Shift" — rather than always
// showing Mac symbols.
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export function formatShortcut(letter: string, opts: { shift?: boolean; alt?: boolean } = {}): string {
  if (isMacPlatform()) {
    return `⌘${opts.shift ? "⇧" : ""}${opts.alt ? "⌥" : ""}${letter.toUpperCase()}`;
  }
  return `Ctrl+${opts.shift ? "Shift+" : ""}${opts.alt ? "Alt+" : ""}${letter.toUpperCase()}`;
}
