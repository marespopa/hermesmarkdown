"use client";

import { useAtom } from "jotai";
import {
  atom_autosaveDelay,
  atom_autosaveMode,
  atom_editorWidth,
  atom_editorFontFamily,
  atom_frontmatterDefaultMode,
  atom_aiProvider,
  atom_selectedAiModel,
  atom_lineHeight,
  atom_vimMode,
  atom_wordWrap,
} from "@/app/atoms/atoms";
import {
  atom_lineNumbers,
  atom_renderedFontSize,
  atom_tabsBarVisibleByDefault,
} from "@/app/atoms/ui-atoms";
import { useRegisterCommand, type Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from "../font-options";

function RegisteredCommand({ command }: { command: Command }) {
  useRegisterCommand(command);
  return null;
}

export default function SettingsCommands() {
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [tabsVisible, setTabsVisible] = useAtom(atom_tabsBarVisibleByDefault);
  const [, setEditorWidth] = useAtom(atom_editorWidth);
  const [, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [, setTextSize] = useAtom(atom_renderedFontSize);
  const [, setLineHeight] = useAtom(atom_lineHeight);
  const [, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [, setFrontmatterMode] = useAtom(atom_frontmatterDefaultMode);
  const [, setAiProvider] = useAtom(atom_aiProvider);
  const [, setSelectedAiModel] = useAtom(atom_selectedAiModel);

  const commands: Command[] = [
    { id: "toggle-word-wrap", label: wordWrap ? "Disable word wrap" : "Enable word wrap", category: "Settings", keywords: "editor lines", action: () => setWordWrap(!wordWrap) },
    { id: "toggle-line-numbers", label: lineNumbers ? "Hide line numbers" : "Show line numbers", category: "Settings", keywords: "editor gutter", action: () => setLineNumbers(!lineNumbers) },
    { id: "toggle-vim-mode", label: vimMode ? "Disable Vim mode" : "Enable Vim mode", category: "Settings", keywords: "editor keybindings modal", action: () => setVimMode(!vimMode) },
    { id: "toggle-tabs-bar-default", label: tabsVisible ? "Hide tabs bar by default" : "Show tabs bar by default", category: "Settings", keywords: "pane files", action: () => setTabsVisible(!tabsVisible) },
    ...(["narrow", "standard", "medium", "wide"] as const).map((value) => ({
      id: `set-editor-width-${value}`,
      label: `Editor width: ${value}`,
      category: "Settings" as const,
      keywords: "appearance line column",
      action: () => setEditorWidth(value),
    })),
    ...FONTS.map(({ label, value }) => ({
      id: `set-editor-font-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label: `Editor font: ${label}`,
      category: "Settings" as const,
      keywords: "typography appearance",
      action: () => setEditorFontFamily(value),
    })),
    ...FONT_SIZES.map(({ label, value }) => ({
      id: `set-text-size-${value}`,
      label: `Text size: ${label}`,
      category: "Settings" as const,
      keywords: "font appearance",
      action: () => setTextSize(value),
    })),
    ...LINE_HEIGHTS.map(({ label, value }) => ({
      id: `set-line-height-${value}`,
      label: `Line height: ${label}`,
      category: "Settings" as const,
      keywords: "typography spacing",
      action: () => setLineHeight(value),
    })),
    ...(["afterDelay", "onFocusChange", "manual"] as const).map((value) => ({
      id: `set-autosave-${value}`,
      label: `Autosave: ${value === "afterDelay" ? "after delay" : value === "onFocusChange" ? "on focus change" : "manual only"}`,
      category: "Settings" as const,
      keywords: "save timing",
      action: () => setAutosaveMode(value),
    })),
    ...([500, 1000, 2000, 3000, 5000, 10000] as const).map((value) => ({
      id: `set-autosave-delay-${value}`,
      label: `Autosave delay: ${value / 1000}s`,
      category: "Settings" as const,
      keywords: "save timing seconds",
      action: () => setAutosaveDelay(value),
    })),
    ...(["fields", "raw"] as const).map((value) => ({
      id: `set-frontmatter-mode-${value}`,
      label: `Frontmatter default: ${value === "fields" ? "Fields" : "Raw YAML"}`,
      category: "Settings" as const,
      keywords: "metadata yaml",
      action: () => setFrontmatterMode(value),
    })),
    {
      id: "set-ai-provider-claude",
      label: "AI provider: Claude",
      category: "Settings",
      keywords: "anthropic model",
      action: () => {
        setAiProvider("claude");
        setSelectedAiModel("sonnet-5");
      },
    },
    {
      id: "set-ai-provider-gemini",
      label: "AI provider: Gemini",
      category: "Settings",
      keywords: "google model",
      action: () => {
        setAiProvider("gemini");
        setSelectedAiModel("gemini-3.5-flash");
      },
    },
  ];

  return <>{commands.map((command) => <RegisteredCommand key={command.id} command={command} />)}</>;
}
