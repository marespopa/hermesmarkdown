import { undo, redo } from "@codemirror/commands";
import {
  cycleTaskStatusOnCurrentLine,
  indentCurrentSubtree,
  outdentCurrentSubtree,
  toggleBold,
  toggleCheckboxOnLine,
  toggleInlineCode,
  toggleItalic,
  toggleStrikethrough,
} from "../../codemirror/commands";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import { TEMPLATES } from "../constants";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildEditorAiVoiceCommandGroups(context: EditorCommandContext) {
  const {
    activeEditorView,
    content,
    hasVoicePreview = false,
    isAiConfigured,
    isVoiceListening = false,
    isVoiceSupported = false,
    onCommitVoice,
    onDiscardVoice,
    onNewAIFile,
    onRunAIAction,
    onToggleVoice,
    runEditorCommand,
    setAiBuilderRequest,
    setRepurposeWizardOpen,
    vaultHandle,
  } = context;

  const aiEntryPoints: Command[] = [
    ...(isAiConfigured
      ? [{
          id: "ai-builder",
          label: "Open AI Chat",
          shortcut: formatShortcut("B", { shift: true }),
          keywords: "ai chat generate create revise section ask",
          action: () => setAiBuilderRequest((value) => value + 1),
        }]
      : []),
    ...(isAiConfigured && vaultHandle
      ? [{
          id: "new-ai-file",
          label: "Generate new note with AI",
          category: "AI" as const,
          keywords: "create write draft prompt",
          action: onNewAIFile,
        }]
      : []),
    ...(isAiConfigured && content.trim()
      ? [{
          id: "repurpose-note",
          label: "Repurpose note into blog / social / newsletter draft…",
          keywords: "repurpose content creator blog social newsletter draft format",
          action: () => setRepurposeWizardOpen(true),
        }]
      : []),
  ];

  const focusAndHistory: Command[] = [
    {
      id: "focus-editor",
      label: "Focus editor",
      keywords: "writing surface",
      disabledReason: activeEditorView ? undefined : "Open a note first",
      action: () => activeEditorView?.focus(),
    },
    ...(activeEditorView
      ? [{
          id: "undo-edit",
          label: "Undo",
          keywords: "undo revert history",
          action: () => undo(activeEditorView),
        }]
      : []),
    ...(activeEditorView
      ? [{
          id: "redo-edit",
          label: "Redo",
          keywords: "redo history",
          action: () => redo(activeEditorView),
        }]
      : []),
  ];

  const editor: Command[] = [
    { id: "format-bold", label: "Format: Bold", category: "Editor" as const, shortcut: formatShortcut("B"), keywords: "strong markdown", action: () => runEditorCommand(toggleBold) },
    { id: "format-italic", label: "Format: Italic", category: "Editor" as const, shortcut: formatShortcut("I"), keywords: "emphasis markdown", action: () => runEditorCommand(toggleItalic) },
    { id: "format-strikethrough", label: "Format: Strikethrough", category: "Editor" as const, shortcut: formatShortcut("X", { shift: true }), keywords: "delete markdown", action: () => runEditorCommand(toggleStrikethrough) },
    { id: "format-inline-code", label: "Format: Inline code", category: "Editor" as const, shortcut: formatShortcut("E"), keywords: "code markdown", action: () => runEditorCommand(toggleInlineCode) },
    { id: "indent-subtree", label: "Indent current item", category: "Editor" as const, keywords: "nest list task", action: () => runEditorCommand(indentCurrentSubtree) },
    { id: "outdent-subtree", label: "Outdent current item", category: "Editor" as const, keywords: "unnest list task", action: () => runEditorCommand(outdentCurrentSubtree) },
    { id: "toggle-checkbox", label: "Toggle checkbox", category: "Tasks" as const, keywords: "task done todo", action: () => runEditorCommand(toggleCheckboxOnLine) },
    { id: "cycle-task-status", label: "Cycle task status", category: "Tasks" as const, shortcut: formatShortcut("Enter"), keywords: "todo progress hold done", action: () => runEditorCommand(cycleTaskStatusOnCurrentLine) },
  ].map((command) => ({
    ...command,
    disabledReason: activeEditorView ? undefined : "Open and focus a note first",
  }));

  // The vault Template entry is slash-menu only (it needs the editor's
  // template picker); "New note from template…" covers the palette.
  const templates: Command[] = TEMPLATES
    .filter((template) => !template.aiOnly && !template.vaultOnly)
    .map((template) => ({
      id: `insert-${template.label.toLowerCase().replace(/\s+/g, "-")}`,
      label: `Insert: ${template.label}`,
      description: template.description,
      category: "Editor",
      keywords: `template markdown ${template.label}`,
      disabledReason: activeEditorView ? undefined : "Open and focus a note first",
      action: () => {
        document.dispatchEvent(new CustomEvent("hermes:insert-template", {
          detail: { label: template.label },
        }));
      },
    }));

  const aiActions: Command[] = [
    ["improve", "AI: Improve writing"],
    ["expand", "AI: Expand selection"],
    ["fix-grammar", "AI: Fix spelling and grammar"],
    ["shorten", "AI: Shorten selection"],
    ["tone-formal", "AI: Change tone to formal"],
    ["tone-casual", "AI: Change tone to casual"],
    ["tone-direct", "AI: Change tone to direct"],
    ["tone-polished", "AI: Change tone to polished"],
    ["summarize", "AI: Summarize selection"],
    ["extract-tasks", "AI: Extract tasks"],
    ["outline", "AI: Create outline"],
    ["title", "AI: Generate title"],
    ["continue", "AI: Continue writing"],
    ["explain", "AI: Explain selection"],
  ].map(([id, label]) => ({
    id: `ai-${id}`,
    label,
    category: "AI",
    keywords: "assistant rewrite selection document",
    disabledReason: !isAiConfigured
      ? "Configure an AI provider in Settings"
      : !activeEditorView
        ? "Open and focus a note first"
        : undefined,
    action: () => onRunAIAction(id),
  }));

  const voice: Command[] = [
    {
      id: "toggle-voice-input",
      label: isVoiceListening ? "Stop voice input" : "Start voice input",
      category: "Voice",
      shortcut: formatShortcut("V", { shift: true }),
      keywords: "dictation microphone speech",
      disabledReason: isVoiceSupported ? undefined : "Voice input is not supported by this browser",
      action: onToggleVoice ?? (() => undefined),
    },
    {
      id: "commit-voice-preview",
      label: "Insert voice preview",
      category: "Voice",
      keywords: "commit dictation transcript",
      disabledReason: hasVoicePreview ? undefined : "No voice preview to insert",
      action: onCommitVoice ?? (() => undefined),
    },
    {
      id: "discard-voice-preview",
      label: "Discard voice preview",
      category: "Voice",
      keywords: "clear cancel dictation transcript",
      danger: true,
      disabledReason: hasVoicePreview ? undefined : "No voice preview to discard",
      action: onDiscardVoice ?? (() => undefined),
    },
  ];

  return { aiEntryPoints, focusAndHistory, editor, templates, aiActions, voice };
}
