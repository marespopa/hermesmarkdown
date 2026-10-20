import { useCallback, useEffect } from "react";
import type React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_aiEnabled } from "@/app/atoms/ai-atoms";
import { atom_activateWorkspaceTab, atom_workspaceTabs } from "@/app/atoms/atoms";
import { openSearchPanel } from "@codemirror/search";
import { atom_activeEditorView, atom_aiBuilderRequest, atom_isAiConfigured, atom_keyboardShortcutsOpen, atom_toggleSentenceFocus, atom_vimMode } from "@/app/atoms/ui-atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useShowFiles } from "@/app/hooks/use-show-files";
import { focusPaneEditor } from "../utils/focus-pane-editor";
import { isCloseTabShortcut, isNewFileShortcut } from "../utils/tab-shortcuts";

interface EditorShortcutOptions {
  navigateWithGuard: (path: string, label: string) => Promise<void>;
  saveRef: React.RefObject<() => Promise<void>>;
  newFileRef: React.RefObject<() => Promise<void>>;
  /** File path of the active tab, closed by the close-tab shortcut. */
  activeTabPath: string | null | undefined;
  closeTabWithAutosave: (path: string) => Promise<void>;
  flush: () => void;
}

// Window-level editor shortcuts (Show Files, search, new note, close/select tab,
// sentence focus, the AI menu, AI chat, save, undo flush, shortcut help). Show / hide sidebar is
// EditorShell's, so it works on every /editor route. Editor-local keys live in CodeMirror's
// keymaps, which run first — so a key CodeMirror handled arrives here with
// defaultPrevented set.
export function useEditorShortcuts({
  navigateWithGuard,
  saveRef,
  newFileRef,
  activeTabPath,
  closeTabWithAutosave,
  flush,
}: EditorShortcutOptions) {
  const { open: openCommandPalette, openMenu: openCommandMenu } = useCommandPalette();
  const vimMode = useAtomValue(atom_vimMode);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const isAiEnabled = useAtomValue(atom_aiEnabled);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const workspaceTabs = useAtomValue(atom_workspaceTabs);
  const activateWorkspaceTab = useSetAtom(atom_activateWorkspaceTab);
  const toggleSentenceFocus = useSetAtom(atom_toggleSentenceFocus);
  const setKeyboardShortcutsOpen = useSetAtom(atom_keyboardShortcutsOpen);
  // Desktop shows the sidebar's Files tree; mobile leaves for the Files page
  // through the unsaved-changes guard.
  const navigateToFiles = useCallback((path: string) => void navigateWithGuard(path, "Files"), [navigateWithGuard]);
  const showFiles = useShowFiles(navigateToFiles);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isVimEditorEvent = vimMode && (e.target as HTMLElement | null)?.closest?.(".cm-editor");
      if (e.key === "Escape" && isVimEditorEvent) return;

      // Prevent tablet/mobile browsers from navigating back on ESC.
      if (e.key === "Escape") e.preventDefault();

      // Show Files: Ctrl/Cmd+Shift+E anywhere. Plain Ctrl/Cmd+B only when the
      // editor didn't already handle it as Bold (CodeMirror runs first and
      // prevents default).
      const isShowFilesShortcut =
        (e.ctrlKey || e.metaKey) && !e.altKey &&
        ((e.shiftKey && e.key.toLowerCase() === "e") ||
          (!e.shiftKey && e.key.toLowerCase() === "b" && !e.defaultPrevented));
      if (isShowFilesShortcut) {
        e.preventDefault();
        showFiles();
      }

      // Find and replace in the active note (Ctrl/Cmd+F). The editor's own
      // keymap handles it while it has focus; this catches the key when focus
      // is elsewhere (toolbar, sidebar, after the palette), which would
      // otherwise open the browser's find bar.
      if (
        (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey &&
        e.key.toLowerCase() === "f" && !e.defaultPrevented && activeEditorView
      ) {
        e.preventDefault();
        openSearchPanel(activeEditorView);
      }

      // Search note text: the palette's `/` scope.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openCommandPalette("/");
      }

      if (isNewFileShortcut(e)) {
        e.preventDefault();
        void newFileRef.current();
      }

      if (isCloseTabShortcut(e) && activeTabPath) {
        e.preventDefault();
        void closeTabWithAutosave(activeTabPath);
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const tabIndex = Number(e.key) - 1;
        const targetTab = workspaceTabs[tabIndex];
        if (targetTab) {
          e.preventDefault();
          activateWorkspaceTab(tabIndex);
          requestAnimationFrame(() => focusPaneEditor(targetTab.paneId));
        }
      }

      // Sentence focus on / off (Ctrl/Cmd+Alt+F).
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        toggleSentenceFocus();
      }

      // Ask or Edit with AI… (Ctrl/Cmd+J): the palette's AI menu.
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "j" && !e.defaultPrevented && isAiEnabled) {
        e.preventDefault();
        openCommandMenu("ai-menu");
      }

      // AI Chat — on-demand, not a status bar button
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b" && isAiConfigured) {
        e.preventDefault();
        setAiBuilderRequest((v) => v + 1);
      }

      // Keyboard shortcuts help (Ctrl/Cmd+?).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "?" || (e.shiftKey && e.code === "Slash"))) {
        e.preventDefault();
        setKeyboardShortcutsOpen(true);
      }

      // Manual save (Ctrl/Cmd+S); Ctrl/Cmd+Shift+S in a note is strikethrough.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s" && !(e.shiftKey && e.defaultPrevented)) {
        e.preventDefault();
        void saveRef.current();
      }

      // Flush pending autosave on undo (Ctrl/Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        flush();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEditorView, activateWorkspaceTab, toggleSentenceFocus, setKeyboardShortcutsOpen, closeTabWithAutosave, flush, isAiConfigured, isAiEnabled, openCommandMenu, setAiBuilderRequest, activeTabPath, vimMode, openCommandPalette, workspaceTabs, showFiles, saveRef, newFileRef]);
}
