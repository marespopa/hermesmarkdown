import { undo, redo } from "@codemirror/commands";
import {
  cycleTaskStatusOnCurrentLine,
  indentCurrentSubtree,
  outdentCurrentSubtree,
  setTaskStatusOnCurrentLine,
  toggleBold,
  toggleCheckboxOnLine,
  toggleInlineCode,
  toggleItalic,
  toggleStrikethrough,
} from "../../codemirror/commands";
import { setHeading, toggleCodeBlock, wrapAsLink } from "../../codemirror/format-shortcuts";
import { foldCurrentSection, unfoldAllSections } from "../../codemirror/heading-fold";
import { goToNextGitChange, goToPreviousGitChange } from "../../codemirror/git-changes";
import { gotoLine, openSearchPanel } from "@codemirror/search";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import { isPlainTextPath } from "@/app/utils/file-kinds";
import { runFormatCode } from "../../codemirror/format-code-command";
import { TEMPLATES } from "../constants";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildEditorAiCommandGroups(context: EditorCommandContext) {
  const {
    activeEditorView,
    activeFilePath,
    isAiEnabled,
    isAiConfigured,
    runEditorCommand,
    setAiBuilderRequest,
    requestCompanionAction,
  } = context;

  const focusAndHistory: Command[] = [
    {
      id: "focus-editor",
      label: "Focus editor",
      keywords: "writing surface",
      disabledReason: activeEditorView ? undefined : "Open a file first",
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
    ...[1, 2, 3, 4, 5, 6].map((level) => ({ id: `format-heading-${level}`, label: `Format: Heading ${level}`, category: "Editor" as const, shortcut: formatShortcut(String(level), { alt: true }), keywords: `h${level} title markdown`, action: () => runEditorCommand(setHeading(level)) })),
    { id: "format-link", label: "Format: Link", category: "Editor" as const, shortcut: formatShortcut("K", { alt: true }), keywords: "url href markdown", action: () => runEditorCommand(wrapAsLink) },
    { id: "format-code-block", label: "Format: Code block", category: "Editor" as const, shortcut: formatShortcut("C", { alt: true }), keywords: "fence snippet markdown", action: () => runEditorCommand(toggleCodeBlock) },
    { id: "format-code", label: "Format Code", category: "Editor" as const, shortcut: isMacPlatform() ? "⇧⌥F" : "Shift+Alt+F", keywords: "prettier beautify pretty print code block fence json typescript javascript css html yaml", action: () => runEditorCommand((view) => runFormatCode(view, !isPlainTextPath(activeFilePath ?? ""))) },
    { id: "find-in-note", label: "Find and replace in file", category: "Editor" as const, shortcut: formatShortcut("F"), keywords: "search replace regex", action: () => runEditorCommand(openSearchPanel) },
    { id: "go-to-line", label: "Go to Line…", category: "Editor" as const, shortcut: formatShortcut("G", { alt: true }), keywords: "jump line number goto", action: () => runEditorCommand(gotoLine) },
    { id: "fold-current-section", label: "Fold current section", category: "Editor" as const, shortcut: formatShortcut(".", { shift: true }), keywords: "collapse heading outline hide", action: () => runEditorCommand(foldCurrentSection) },
    { id: "unfold-all-sections", label: "Unfold all sections", category: "Editor" as const, shortcut: formatShortcut(",", { shift: true }), keywords: "expand headings sections show", action: () => runEditorCommand(unfoldAllSections) },
    { id: "next-git-change", label: "Next Git change", category: "Editor" as const, shortcut: isMacPlatform() ? "⌥F5" : "Alt+F5", keywords: "diff changes git head commit jump hunk", action: () => runEditorCommand(goToNextGitChange) },
    { id: "previous-git-change", label: "Previous Git change", category: "Editor" as const, shortcut: isMacPlatform() ? "⇧⌥F5" : "Shift+Alt+F5", keywords: "diff changes git head commit jump hunk", action: () => runEditorCommand(goToPreviousGitChange) },
    { id: "indent-subtree", label: "Indent current item", category: "Editor" as const, keywords: "nest list task", action: () => runEditorCommand(indentCurrentSubtree) },
    { id: "outdent-subtree", label: "Outdent current item", category: "Editor" as const, keywords: "unnest list task", action: () => runEditorCommand(outdentCurrentSubtree) },
    { id: "toggle-checkbox", label: "Toggle checkbox", category: "Tasks" as const, keywords: "task done todo", action: () => runEditorCommand(toggleCheckboxOnLine) },
    { id: "cycle-task-status", label: "Cycle task status", category: "Tasks" as const, shortcut: formatShortcut("Enter"), keywords: "todo progress done", action: () => runEditorCommand(cycleTaskStatusOnCurrentLine) },
    { id: "task-status-prog", label: "Task: Start", category: "Tasks" as const, keywords: "in progress doing [/]", action: () => runEditorCommand(setTaskStatusOnCurrentLine("prog")) },
    { id: "task-status-hold", label: "Task: Put on hold", category: "Tasks" as const, keywords: "blocked waiting pause [!]", action: () => runEditorCommand(setTaskStatusOnCurrentLine("hold")) },
    { id: "task-status-cancelled", label: "Task: Cancel", category: "Tasks" as const, keywords: "drop won't do [-]", action: () => runEditorCommand(setTaskStatusOnCurrentLine("cancelled")) },
    { id: "task-status-todo", label: "Task: Reset to To Do", category: "Tasks" as const, keywords: "reopen open [ ]", action: () => runEditorCommand(setTaskStatusOnCurrentLine("todo")) },
  ].map((command) => ({
    ...command,
    disabledReason: activeEditorView ? undefined : "Open and focus a note first",
  }));

  // The vault Template and Template field entries are slash-menu only (they
  // need the editor's template picker / a template note); "New note from
  // template…" covers the palette.
  const templates: Command[] = TEMPLATES
    .filter((template) => !template.aiOnly && !template.vaultOnly && !template.templateOnly && !template.saveTemplateOnly)
    .map((template) => ({
      id: `insert-${template.label.toLowerCase().replace(/\s+/g, "-")}`,
      label: `Insert: ${template.label}`,
      description: template.description,
      category: "Editor",
      keywords: `template markdown ${template.label}`,
      closeFirst: true,
      disabledReason: activeEditorView ? undefined : "Open and focus a note first",
      action: () => {
        document.dispatchEvent(new CustomEvent("hermes:insert-template", {
          detail: { label: template.label },
        }));
      },
    }));

  // Ask AI (Ctrl/Cmd+J) opens the AI companion with the note in front and
  // its selection; New AI chat and Summarize AI chat open it and start over
  // or replace the thread with its summary (as /new and /compact). With AI
  // Features off, there are none.
  const noKey = isAiConfigured ? undefined : "Add an API key in Settings → AI Features";
  const aiMenu: Command[] = !isAiEnabled ? [] : [{
    id: "ai-menu",
    label: "Ask AI",
    description: "Open the AI panel",
    category: "AI",
    shortcut: formatShortcut("J"),
    keywords: "ai assistant chat prompt ask companion rewrite improve summarize edit",
    disabledReason: noKey,
    action: () => setAiBuilderRequest((value) => value + 1),
  }, {
    id: "ai-new-chat",
    label: "New AI chat",
    description: "Clear the AI conversation and start over",
    category: "AI",
    keywords: "ai companion chat clear reset start over new conversation /new /clear",
    disabledReason: noKey,
    action: () => requestCompanionAction("new"),
  }, {
    id: "ai-compact-chat",
    label: "Summarize AI chat",
    description: "Replace the AI conversation with a summary of it",
    category: "AI",
    keywords: "ai companion chat compact summarize condense shorten conversation context /compact",
    disabledReason: noKey,
    action: () => requestCompanionAction("compact"),
  }];

  return { aiMenu, focusAndHistory, editor, templates };
}
