import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { lockablePair } from "@/app/atoms/layout-tree";
import type { EditorCommandContext } from "./use-editor-command-context";

// Preview panes and scroll lock: a pane is an editor or a read-only preview,
// and two side-by-side panes can be scrolled together.
export function buildPaneLayoutCommands(context: EditorCommandContext): Command[] {
  const { activeLeaf, activeFilePath, workspaceLayout, splitPane, setPaneType, toggleScrollLock } = context;
  if (!activeLeaf) return [];

  const pair = lockablePair(workspaceLayout.rootContainer, activeLeaf.id);
  const isPreview = activeLeaf.type === "preview";

  return [
    {
      id: "open-preview-side",
      label: "Open Preview to the Side",
      category: "Workspace",
      keywords: "preview read-only side by side split live render",
      action: () =>
        splitPane({
          id: activeLeaf.id,
          direction: "horizontal",
          filePath: activeFilePath,
          type: "preview",
          copy: true,
          focusNew: false,
          scrollLock: true,
        }),
    },
    {
      id: "toggle-pane-preview",
      label: isPreview ? "Show Pane as Editor" : "Show Pane as Preview",
      category: "Workspace",
      keywords: "preview editor read-only pane switch mode",
      action: () => setPaneType({ paneId: activeLeaf.id, type: isPreview ? "editor" : "preview" }),
    },
    {
      id: "toggle-scroll-lock",
      label: pair?.scrollLock ? "Unlock Scroll" : "Lock Scroll With Other Pane",
      category: "Workspace",
      keywords: "scroll sync lock unlock panes together",
      disabledReason: pair ? undefined : "No side-by-side pane",
      action: () => toggleScrollLock(activeLeaf.id),
    },
  ];
}
