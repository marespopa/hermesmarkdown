"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  atom_autosaveMode,
  atom_editorFontFamily,
  atom_renderedFontSize,
  atom_vimMode,
  atom_wordWrap,
} from "@/app/atoms/atoms";
import { atom_focusMode, atom_fullWidth, atom_lineNumbers, atom_showInvisibles, atom_showWordCount, atom_toggleSentenceFocus } from "@/app/atoms/ui-atoms";
import { useRegisterCommand, type Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { FOCUS_OPTIONS } from "../focus-options";
import { FONTS, TEXT_SIZES } from "../font-options";
import { formatShortcut } from "@/app/utils/platform";

function RegisteredCommand({ command }: { command: Command }) {
  useRegisterCommand(command);
  return null;
}

export default function SettingsCommands() {
  const [fullWidth, setFullWidth] = useAtom(atom_fullWidth);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [showInvisibles, setShowInvisibles] = useAtom(atom_showInvisibles);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [showWordCount, setShowWordCount] = useAtom(atom_showWordCount);
  const [focusMode, setFocusMode] = useAtom(atom_focusMode);
  const toggleSentenceFocus = useSetAtom(atom_toggleSentenceFocus);
  const [, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [, setTextSize] = useAtom(atom_renderedFontSize);
  const [, setAutosaveMode] = useAtom(atom_autosaveMode);

  const commands: Command[] = [
    { id: "toggle-full-width", label: "Toggle Full Width", category: "Settings", keywords: "editor layout wide column line length measure", action: () => setFullWidth(!fullWidth) },
    { id: "toggle-word-wrap", label: "Toggle Word Wrap", category: "Settings", keywords: "editor lines wrap", action: () => setWordWrap(!wordWrap) },
    { id: "toggle-line-numbers", label: "Toggle Line Numbers", category: "Settings", keywords: "editor gutter", action: () => setLineNumbers(!lineNumbers) },
    { id: "toggle-invisibles", label: "Toggle Invisibles", category: "Settings", keywords: "whitespace empty lines blank spaces tabs pilcrow", action: () => setShowInvisibles(!showInvisibles) },
    { id: "toggle-word-count", label: "Toggle Word Count", category: "Settings", keywords: "words stats statistics length counter", action: () => setShowWordCount(!showWordCount) },
    { id: "toggle-vim-mode", label: "Toggle Vim Mode", category: "Settings", keywords: "editor keybindings modal", action: () => setVimMode(!vimMode) },
    // Focus: one command per level; the current one is disabled.
    ...FOCUS_OPTIONS.map(({ label, value }) => ({
      id: `set-focus-${value}`,
      label: `Focus: ${label}`,
      category: "Settings" as const,
      keywords: "focus distraction free hide interface chrome toolbar tabs sidebar typing dim paragraph typewriter flow writing",
      disabledReason: focusMode === value ? "Current setting" : undefined,
      action: () => setFocusMode(value),
    })),
    {
      id: "toggle-sentence-focus",
      label: "Toggle Sentence Focus",
      category: "Settings",
      keywords: "focus sentence dim typewriter flow writing distraction free",
      shortcut: formatShortcut("F", { alt: true }),
      action: () => toggleSentenceFocus(),
    },
    ...FONTS.map(({ label, value }) => ({
      id: `set-editor-font-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label: `Editor Font: ${label}`,
      category: "Settings" as const,
      keywords: "typography appearance",
      action: () => setEditorFontFamily(value),
    })),
    ...TEXT_SIZES.map(({ label, value }) => ({
      id: `set-text-size-${value}`,
      label: `Text Size: ${label}`,
      category: "Settings" as const,
      keywords: "font typography appearance zoom bigger smaller",
      action: () => setTextSize(value),
    })),
    ...(["afterDelay", "manual"] as const).map((value) => ({
      id: `set-autosave-${value}`,
      label: `Autosave: ${value === "afterDelay" ? "After Delay" : "Manual Only"}`,
      category: "Settings" as const,
      keywords: "save timing",
      action: () => setAutosaveMode(value),
    })),
  ];

  return <>{commands.map((command) => <RegisteredCommand key={command.id} command={command} />)}</>;
}
