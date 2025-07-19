import { useRef, useEffect } from "react";

// Define a type for available command names
export type CommandNames = "save" | "open" | "new" | "export" | "home" | "template" | "table" | "escape" | "enter";

interface Command {
  key: string;
  hasModifier: boolean;
  shift?: boolean;
  alt?: boolean;
}

// Command registry defining key combinations
const commandRegistry: Record<CommandNames, Command> = {
  save: { key: "y", hasModifier: true, shift: true },      // Ctrl+Shift+Y / Cmd+Shift+Y
  new: { key: "u", hasModifier: true, shift: true },       // Ctrl+Shift+U / Cmd+Shift+U
  open: { key: "i", hasModifier: true, shift: true },      // Ctrl+Shift+I / Cmd+Shift+I
  export: { key: "e", hasModifier: true, shift: true },    // Ctrl+Shift+E / Cmd+Shift+E
  template: { key: "m", hasModifier: true, shift: true },  // Ctrl+Shift+M / Cmd+Shift+M
  table: { key: "t", hasModifier: true, shift: true },     // Ctrl+Shift+T / Cmd+Shift+T
  home: { key: "h", hasModifier: true, shift: true },      // Ctrl+Shift+H / Cmd+Shift+H
  escape: { key: "Escape", hasModifier: false },
  enter: { key: "Enter", hasModifier: false },
};

export function useCommand(
  command: CommandNames,  // Use CommandNames type here
  cb: (event: KeyboardEvent) => void
) {
  const callback = useRef(cb);

  useEffect(() => {
    callback.current = cb;
  }, [cb]);

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const { key, hasModifier, shift, alt } = commandRegistry[command];

      const isMatchingKey = event.key === key;
      const isModifierActive = event.metaKey || event.ctrlKey;
      const isShiftActive = shift ? event.shiftKey : !event.shiftKey;
      const isAltActive = alt ? event.altKey : !event.altKey;

      if (
        isMatchingKey &&
        (!hasModifier || isModifierActive) &&
        isShiftActive &&
        isAltActive
      ) {
        cancelDefaultBrowserBehaviour(event);
        callback.current(event);
      }
    }

    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [command]);

  function cancelDefaultBrowserBehaviour(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
}
