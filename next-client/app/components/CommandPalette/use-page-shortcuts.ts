import { useEffect } from "react";
import { useCommandPalette } from "./CommandPaletteContext";
import { matchPageShortcut, pageCommand, runPageCommand } from "./page-shortcuts";

// Window-level keys for the editor's pages (PAGE_SHORTCUTS), on every
// /editor route. Each runs the page's palette command, so the editor's
// unsaved-changes guard applies; on the page already it does nothing.
export function usePageShortcuts(enabled = true) {
  const { commands, isOpen, close } = useCommandPalette();

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const shortcut = matchPageShortcut(event);
      const command = shortcut && pageCommand(shortcut, commands);
      if (!command) return;
      event.preventDefault();
      if (command.disabledReason) return;
      if (isOpen) close();
      runPageCommand(command);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, commands, isOpen, close]);
}

// The hook as a component that draws nothing, so the palette context's
// changes (opening and closing it, commands registering) re-render only it,
// not the frame that mounts it.
export function PageShortcuts() {
  usePageShortcuts();
  return null;
}
