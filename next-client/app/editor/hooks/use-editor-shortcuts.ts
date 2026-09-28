import { useEffect } from "react";
import type React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_activateWorkspaceTab, atom_workspaceTabs } from "@/app/atoms/atoms";
import { atom_aiBuilderRequest, atom_isAiConfigured, atom_vimMode } from "@/app/atoms/ui-atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { focusPaneEditor } from "../utils/focus-pane-editor";
import { isCloseTabShortcut, isNewFileShortcut } from "../utils/tab-shortcuts";

interface EditorShortcutOptions {
  navigateWithGuard: (path: string, label: string) => Promise<void>;
  saveRef: React.RefObject<() => Promise<void>>;
  newFileRef: React.RefObject<() => Promise<void>>;
  /** File path of the active tab, closed by the close-tab shortcut. */
  activeTabPath: string | null | undefined;
  closeTabWithAutosave: (path: string) => Promise<void>;
  isVoiceSupported: boolean;
  toggleVoiceListening: () => void;
  flush: () => void;
}

// Window-level editor shortcuts (Explorer, search, new file, close/select tab,
// AI chat, voice, save, undo flush). Editor-local keys live in CodeMirror's
// keymaps, which run first — so a key CodeMirror handled arrives here with
// defaultPrevented set.
export function useEditorShortcuts({
  navigateWithGuard,
  saveRef,
  newFileRef,
  activeTabPath,
  closeTabWithAutosave,
  isVoiceSupported,
  toggleVoiceListening,
  flush,
}: EditorShortcutOptions) {
  const { open: openCommandPalette } = useCommandPalette();
  const vimMode = useAtomValue(atom_vimMode);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const setAiBuilderRequest = useSetAtom(atom_aiBuilderRequest);
  const workspaceTabs = useAtomValue(atom_workspaceTabs);
  const activateWorkspaceTab = useSetAtom(atom_activateWorkspaceTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isVimEditorEvent = vimMode && (e.target as HTMLElement | null)?.closest?.(".cm-editor");
      if (e.key === "Escape" && isVimEditorEvent) return;

      // Prevent tablet/mobile browsers from navigating back on ESC.
      if (e.key === "Escape") e.preventDefault();

      // Explorer: Ctrl/Cmd+Shift+E anywhere. Plain Ctrl/Cmd+B only when the
      // editor didn't already handle it as Bold (CodeMirror runs first and
      // prevents default).
      const isExplorerShortcut =
        (e.ctrlKey || e.metaKey) && !e.altKey &&
        ((e.shiftKey && e.key.toLowerCase() === "e") ||
          (!e.shiftKey && e.key.toLowerCase() === "b" && !e.defaultPrevented));
      if (isExplorerShortcut) {
        e.preventDefault();
        void navigateWithGuard("/editor/files", "Files");
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openCommandPalette();
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

      // AI Chat — on-demand, not a status bar button
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b" && isAiConfigured) {
        e.preventDefault();
        setAiBuilderRequest((v) => v + 1);
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && isVoiceSupported) {
        e.preventDefault();
        toggleVoiceListening();
      }

      // Manual save (Ctrl/Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
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
  }, [activateWorkspaceTab, closeTabWithAutosave, flush, isAiConfigured, setAiBuilderRequest, activeTabPath, vimMode, isVoiceSupported, toggleVoiceListening, openCommandPalette, workspaceTabs, navigateWithGuard, saveRef, newFileRef]);
}
