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
import { openSearchPanel } from "@codemirror/search";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import { TEMPLATES } from "../constants";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildEditorAiCommandGroups(context: EditorCommandContext) {
  const {
    activeEditorView,
    isAiEnabled,
    isAiConfigured,
    onRunAIAction,
    runEditorCommand,
    setAiBuilderRequest,
  } = context;

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
    ...[1, 2, 3, 4, 5, 6].map((level) => ({ id: `format-heading-${level}`, label: `Format: Heading ${level}`, category: "Editor" as const, shortcut: formatShortcut(String(level), { alt: true }), keywords: `h${level} title markdown`, action: () => runEditorCommand(setHeading(level)) })),
    { id: "format-link", label: "Format: Link", category: "Editor" as const, shortcut: formatShortcut("L", { shift: true }), keywords: "url href markdown", action: () => runEditorCommand(wrapAsLink) },
    { id: "format-code-block", label: "Format: Code block", category: "Editor" as const, shortcut: formatShortcut("C", { alt: true }), keywords: "fence snippet markdown", action: () => runEditorCommand(toggleCodeBlock) },
    { id: "find-in-note", label: "Find and replace in note", category: "Editor" as const, shortcut: formatShortcut("F"), keywords: "search replace regex", action: () => runEditorCommand(openSearchPanel) },
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

  // One AI entry, Ask or Edit with AI… (Ctrl/Cmd+J), a menu of four modes
  // instead of every prompt as its own command: Freeform Prompt (AI Chat),
  // then Improve Writing, Summarize / Structure and Insert Element, each a
  // menu of one-click actions. With AI Features off, there is no menu at all.
  const noKey = isAiConfigured ? undefined : "Add an API key in Settings → AI Features";
  const aiAction = (id: string, label: string, keywords: string): Command => ({
    id: `ai-${id}`,
    label,
    category: "AI",
    keywords,
    disabledReason: noKey ?? (activeEditorView ? undefined : "Open and focus a note first"),
    action: () => onRunAIAction(id),
  });
  const aiMode = (id: string, label: string, description: string, keywords: string, subcommands: Command[]): Command => ({
    id: `ai-mode-${id}`,
    label,
    description,
    category: "AI",
    keywords,
    subcommands,
    action: () => {},
  });
  const aiMenu: Command[] = !isAiEnabled ? [] : [{
    id: "ai-menu",
    label: "Ask or Edit with AI…",
    category: "AI",
    shortcut: formatShortcut("J"),
    keywords: "ai assistant chat prompt ask rewrite improve grammar tone summarize outline tasks table diagram mermaid formula",
    subcommands: [
      {
        id: "ai-builder",
        label: "Freeform Prompt",
        description: "Ask anything in AI Chat",
        category: "AI",
        shortcut: formatShortcut("B", { shift: true }),
        keywords: "ai chat generate create revise section ask type anything",
        disabledReason: noKey,
        action: () => setAiBuilderRequest((value) => value + 1),
      },
      aiMode("improve", "Improve Writing", "Fix grammar, adjust tone, format", "rewrite edit polish grammar spelling tone shorten expand", [
        aiAction("improve", "Improve writing", "clarity flow concise rewrite"),
        aiAction("fix-grammar", "Fix spelling and grammar", "proofread typos"),
        aiAction("shorten", "Shorten selection", "compress concise trim"),
        aiAction("expand", "Expand selection", "elaborate longer idea"),
        aiAction("continue", "Continue writing", "next paragraph more"),
        aiAction("tone-formal", "Change tone to formal", "tone voice"),
        aiAction("tone-casual", "Change tone to casual", "tone voice"),
        aiAction("tone-direct", "Change tone to direct", "tone voice"),
        aiAction("tone-polished", "Change tone to polished", "tone voice"),
      ]),
      aiMode("structure", "Summarize / Structure", "Extract tasks, key points, outline", "summary summarize tasks todos outline key points title explain", [
        aiAction("summarize", "Summarize selection", "summary key points tldr"),
        aiAction("extract-tasks", "Extract tasks", "todos checklist action items"),
        aiAction("outline", "Create outline", "headings structure bullets"),
        aiAction("title", "Generate title", "name heading"),
        aiAction("explain", "Explain selection", "simplify meaning"),
      ]),
      aiMode("insert", "Insert Element", "Generate a table, Mermaid diagram or formula", "generate table diagram mermaid chart flowchart formula math calculation", [
        aiAction("table", "Generate table", "pipe table columns rows"),
        aiAction("diagram", "Generate Mermaid diagram", "mermaid chart flowchart sequence timeline"),
        aiAction("formula", "Generate formula", "math equation calculation spreadsheet katex"),
      ]),
    ],
    action: () => {},
  }];

  return { aiMenu, focusAndHistory, editor, templates };
}
