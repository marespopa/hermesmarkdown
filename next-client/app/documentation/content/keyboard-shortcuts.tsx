import { ShortcutGroups, type Subsection } from "../doc-primitives";

// Documentation content: the keyboard shortcut reference (Get Started).
export const keyboardShortcutsItem: Subsection = {
  id: "keyboard-shortcuts",
  title: "Keyboard shortcuts",
  lead: "The full reference, grouped by where you're using it.",
  keywords: "shortcuts ctrl tab arrows formula",
  body: (
    <ShortcutGroups
      groups={[
        {
          context: "Editor",
          rows: [
            { label: "Save", shortcut: "CTRL/CMD+S" },
            { label: "Bold", shortcut: "CTRL/CMD+B" },
            { label: "Italic", shortcut: "CTRL/CMD+I" },
            { label: "Strikethrough", shortcut: "CTRL/CMD+SHIFT+X" },
            { label: "Inline code", shortcut: "CTRL/CMD+E" },
            { label: "Heading 1–6 (press again to remove)", shortcut: "CTRL/CMD+ALT+1…6" },
            { label: "Link", shortcut: "CTRL/CMD+SHIFT+L" },
            { label: "Code block", shortcut: "CTRL/CMD+ALT+C" },
            { label: "Find and replace in note", shortcut: "CTRL/CMD+F" },
            { label: "Undo / redo", shortcut: "CTRL/CMD+Z / CTRL+Y" },
            { label: "Indent / outdent list item (4 spaces a level)", shortcut: "TAB / SHIFT+TAB" },
            { label: "New list item (Enter twice ends the list)", shortcut: "ENTER" },
            { label: "Plain line break (caret at the start of the next row)", shortcut: "SHIFT+ENTER" },
            { label: "Cycle task status", shortcut: "CTRL/CMD+ENTER" },
            { label: "Open helper at cursor (link, date, diagram, image)", shortcut: "CTRL/CMD+SHIFT+ENTER" },
            { label: "AI Chat", shortcut: "CTRL+SHIFT+B" },
            { label: "Dismiss / close", shortcut: "ESCAPE" },
          ],
        },
        {
          context: "Tabs & notes",
          rows: [
            { label: "Show Files", shortcut: "CTRL/CMD+SHIFT+E" },
            { label: "New note", shortcut: "CTRL+ALT+N" },
            { label: "Close current tab", shortcut: "CTRL/CMD+ALT+W" },
            { label: "Select workspace tab", shortcut: "CTRL/CMD+1–9" },
            { label: "Show / hide sidebar", shortcut: "CTRL/CMD+\\ or CTRL/CMD+ALT+S" },
            { label: "Show / hide tab bar", shortcut: "CTRL/CMD+SHIFT+\\" },
            { label: "Sentence focus on / off", shortcut: "CTRL/CMD+ALT+F" },
          ],
        },
        {
          context: "Table",
          rows: [
            { label: "Next / previous cell", shortcut: "TAB / SHIFT+TAB" },
            { label: "Cell below (adds a row at the end)", shortcut: "ENTER" },
            { label: "Move across cells, leave the table", shortcut: "ARROWS" },
            { label: "Leave the table", shortcut: "ESCAPE" },
            { label: "Insert row below", shortcut: "CTRL/CMD+ENTER" },
            { label: "Delete row", shortcut: "CTRL/CMD+SHIFT+BACKSPACE" },
            { label: "Move row up / down", shortcut: "ALT+↑ / ALT+↓" },
            { label: "Move column left / right", shortcut: "CTRL/CMD+ALT+← / →" },
            { label: "Row, column & table actions", shortcut: "RIGHT-CLICK a cell" },
          ],
        },
        {
          context: "Navigation",
          rows: [
            { label: "Open Link or Date", shortcut: "CTRL+CLICK" },
            { label: "Cycle task status", shortcut: "CTRL+CLICK [ ]" },
            { label: "Cycle lifecycle tag", shortcut: "CLICK ‹ #tag ›" },
          ],
        },
        {
          context: "Command Palette",
          rows: [
            { label: "Open Quick Switcher", shortcut: "CTRL/CMD+K or CTRL/CMD+P" },
            { label: "Open Command Palette", shortcut: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
            { label: "Search note text", shortcut: "CTRL/CMD+SHIFT+F" },
            { label: "Filter", shortcut: "Keep typing" },
            { label: "Switch between files and commands", shortcut: "CLICK >" },
            { label: "Navigate results", shortcut: "↑ / ↓ or TAB" },
            { label: "Pin / unpin the selected item", shortcut: "CTRL/CMD+D" },
            { label: "Run command", shortcut: "ENTER" },
            { label: "Dismiss", shortcut: "ESCAPE" },
          ],
        },
      ]}
    />
  ),
};
