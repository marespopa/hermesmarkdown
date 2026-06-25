"use client";

import { DocPageLayout, DocShortcutGroup } from "@/app/documentation/components/DocPageLayout";

export default function KeyboardShortcutsPage() {
  return (
    <DocPageLayout
      cluster="Get started"
      clusterHref="/documentation"
      title="Keyboard shortcuts"
      summary="The full reference, grouped by where you're using it."
      related={[
        { href: "/documentation/editor/command-palette", label: "Command Palette" },
        { href: "/documentation/editor/tables", label: "Tables" },
        { href: "/documentation/settings/keybindings", label: "Keybindings" },
      ]}
    >
      <DocShortcutGroup
        groups={[
          {
            context: "Editor",
            rows: [
              { label: "Save", shortcut: "CTRL+S" },
              { label: "Bold", shortcut: "CTRL+B" },
              { label: "Italic", shortcut: "CTRL+I" },
              { label: "Undo", shortcut: "CTRL+Z" },
              { label: "Open link pill", shortcut: "CTRL+ENTER" },
              { label: "Expand date picker", shortcut: "ALT+↓" },
              { label: "Toggle sidebar", shortcut: "CTRL+SHIFT+E" },
              { label: "Document info", shortcut: "CTRL+SHIFT+I" },
              { label: "AI Builder", shortcut: "CTRL+SHIFT+B" },
              { label: "Dismiss / close", shortcut: "ESCAPE" },
            ],
          },
          {
            context: "Table",
            rows: [
              { label: "Move between cells", shortcut: "TAB / SHIFT+TAB / ARROWS" },
              { label: "Edit focused cell", shortcut: "ENTER" },
              { label: "Select a range", shortcut: "SHIFT+CLICK / SHIFT+ARROWS" },
              { label: "Start a formula", shortcut: "TYPE =" },
              { label: "New row at end", shortcut: "ENTER on last row" },
            ],
          },
          {
            context: "Navigation",
            rows: [
              { label: "Open link or date", shortcut: "CTRL+CLICK" },
              { label: "Toggle task checkbox", shortcut: "CLICK [ ] / [x]" },
              { label: "Cycle lifecycle tag", shortcut: "CLICK ‹ #tag ›" },
            ],
          },
          {
            context: "Command Palette",
            rows: [
              { label: "Open", shortcut: "CTRL+SHIFT+P" },
              { label: "Filter", shortcut: "Keep typing" },
              { label: "Navigate results", shortcut: "↑ / ↓" },
              { label: "Run command", shortcut: "ENTER" },
              { label: "Dismiss", shortcut: "ESCAPE" },
            ],
          },
        ]}
      />
    </DocPageLayout>
  );
}
