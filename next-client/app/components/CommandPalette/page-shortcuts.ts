import { showErrorToast } from "@/app/components/Toastr";
import { formatShortcut } from "@/app/utils/platform";
import type { Command } from "./CommandPaletteContext";

// Direct keys for the editor's pages, so they can be reached without the
// palette: shown on their palette rows, the empty pane's chips and the
// shortcut lists, and run by usePageShortcuts. `ids` are the page's palette
// commands; of a pair only the one for the route you're on is registered.
export type PageShortcut = {
  label: string;
  ids: string[];
  /** The key as typed (Windows/Linux), and its `code` (macOS, where ⌥ changes `key`). */
  key: string;
  code: string;
  alt: boolean;
  /** Only for a git vault: the empty pane leaves its chip out otherwise. */
  needsGit?: boolean;
};

export const PAGE_SHORTCUTS: PageShortcut[] = [
  { label: "Tasks", ids: ["open-tasks-panel", "go-tasks"], key: "t", code: "KeyT", alt: true },
  { label: "Changes", ids: ["show-changes"], key: "g", code: "KeyG", alt: true, needsGit: true },
  { label: "Templates", ids: ["open-templates", "go-templates"], key: "p", code: "KeyP", alt: true },
  { label: "Settings", ids: ["open-settings"], key: ",", code: "Comma", alt: false },
];

export function formatPageShortcut(shortcut: PageShortcut): string {
  return formatShortcut(shortcut.key, { alt: shortcut.alt });
}

// The key shown on a page command's palette row, if it has one.
export function pageShortcutFor(commandId: string): string | undefined {
  const shortcut = PAGE_SHORTCUTS.find((candidate) => candidate.ids.includes(commandId));
  return shortcut && formatPageShortcut(shortcut);
}

// Ctrl/Cmd(+Alt)+key. Off macOS it matches `key`, so AltGr (Ctrl+Alt on
// Windows) typing a letter such as ț is left alone.
export function matchPageShortcut(event: KeyboardEvent): PageShortcut | undefined {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return undefined;
  return PAGE_SHORTCUTS.find((shortcut) =>
    event.altKey === shortcut.alt &&
    (event.metaKey ? event.code === shortcut.code : event.key.toLowerCase() === shortcut.key));
}

// The registered command a page shortcut runs, if any.
export function pageCommand(shortcut: PageShortcut, commands: Command[]): Command | undefined {
  return commands.find((command) => shortcut.ids.includes(command.id));
}

// Runs a page command from a key or a chip, with the palette's error toast.
export function runPageCommand(command: Command) {
  Promise.resolve(command.action()).catch((error: unknown) => {
    showErrorToast(error instanceof Error ? error.message : `Failed to run ${command.label}`);
  });
}
