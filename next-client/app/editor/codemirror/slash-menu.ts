import { CompletionContext, CompletionResult, Completion } from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import {
  TEMPLATES,
  SHORTCODES,
  LINK_EDITOR_SENTINEL,
  WIKILINK_EDITOR_SENTINEL,
  DATE_EDITOR_SENTINEL,
  TABLE_DIALOG_SENTINEL,
  FRONTMATTER_WIZARD_SENTINEL,
  TASK_EDITOR_SENTINEL,
  AI_CHAT_SENTINEL,
  VAULT_TEMPLATE_SENTINEL,
  TEMPLATE_FIELD_SENTINEL,
  SAVE_AS_TEMPLATE_SENTINEL,
  CURSOR_SENTINEL,
  CODE_BLOCK_TEMPLATE_CONTENT,
  MARK_SENSITIVE_SENTINEL,
  MARK_PRIVATE_SENTINEL,
  MARK_PUBLIC_SENTINEL,
} from "../components/constants";
import { FM_REGEX, updateFmFields } from "@/app/utils/frontmatter-utils";
import { clearSensitiveMarkers, isSensitiveContent } from "@/app/utils/note-privacy";

// Non-AI templates only — AI action entries (aiOnly: true) aren't ported in
// this pass (that's a separate AI-subsystem port, not part of the CM6
// migration). Frontmatter wizard, Link/WikiLink/Date/Table sentinels are.
// The vault Template entry is added only when the editor can insert one, and
// Template field only while editing a template.
const AVAILABLE_TEMPLATES = TEMPLATES.filter((t) => !t.aiOnly && !t.vaultOnly && !t.templateOnly && !t.saveTemplateOnly);
const VAULT_TEMPLATE_ENTRIES = TEMPLATES.filter((t) => t.content === VAULT_TEMPLATE_SENTINEL);
const TEMPLATE_FIELD_ENTRIES = TEMPLATES.filter((t) => t.templateOnly);
const SAVE_TEMPLATE_ENTRIES = TEMPLATES.filter((t) => t.saveTemplateOnly);

export interface SlashMenuCallbacks {
  onOpenLinkDialog: (range: { from: number; to: number }) => void;
  onOpenWikiLinkDialog: (range: { from: number; to: number }) => void;
  onOpenDatePicker: (range: { from: number; to: number }) => void;
  onOpenTaskDialog: (range: { from: number; to: number }) => void;
  onOpenAIChat?: () => void;
  /** Opens the vault template picker; the trigger text is already removed. */
  onInsertVaultTemplate?: () => void;
  /** Opens the template field menu; set only while the note is a template. */
  onInsertTemplateField?: () => void;
  /** "Ask a question…" / "Blank to fill in…" in the field menu: the name, or null. */
  onAskTemplateQuestion?: (kind: "question" | "blank") => Promise<string | null>;
  /** Saves the note as a template; set with a vault, outside template notes. */
  onSaveAsTemplate?: () => void;
  onFrontmatterWizard: () => void;
  onCodeBlockInserted: (pos: number) => void;
}

function fuzzyMatch(label: string, query: string): boolean {
  if (!query) return true;
  const hay = label.toLowerCase();
  // Hyphens stand in for spaces, since a space closes the menu: "/mark-as-private".
  const q = query.toLowerCase().replace(/-/g, "");
  let qi = 0;
  for (let hi = 0; hi < hay.length && qi < q.length; hi++) {
    if (hay[hi] === q[qi]) qi++;
  }
  return qi === q.length;
}

function insertPlainContent(view: EditorView, from: number, to: number, content: string): number {
  let processed = content;
  Object.entries(SHORTCODES).forEach(([code, getValue]) => {
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<!\\\\)${escaped}`, "g");
    processed = processed.replace(regex, getValue());
  });
  processed = processed.replace(/\\(\{[\w]+\})/g, "$1");
  processed = processed.replace(/\\\.\.d/g, "..d");

  const sentinelIdx = processed.indexOf(CURSOR_SENTINEL);
  const clean = sentinelIdx !== -1 ? processed.replace(CURSOR_SENTINEL, "") : processed;

  view.dispatch({
    changes: { from, to, insert: clean },
    selection: EditorSelection.cursor(sentinelIdx !== -1 ? from + sentinelIdx : from + clean.length),
    userEvent: "input.replace.template",
  });
  return sentinelIdx !== -1 ? from + sentinelIdx : from + clean.length;
}

// Inserts an already-expanded vault template over the main selection as one
// undo step. No SHORTCODES pass: `{date}` in a template stays literal. The
// caret goes to `cursor` (an offset in `text`) or the end of the insert.
export function insertExpandedTemplate(view: EditorView, text: string, cursor: number | null) {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: text },
    selection: EditorSelection.cursor(from + (cursor ?? text.length)),
    userEvent: "input.replace.template",
    scrollIntoView: true,
  });
  view.focus();
  playTemplateIn(view);
}

// A quick slide-and-fade on the text after a template lands (globals.scss).
function playTemplateIn(view: EditorView) {
  const content = view.contentDOM;
  content.classList.remove("cm-template-in");
  void content.offsetWidth; // restart the animation on back-to-back inserts
  content.classList.add("cm-template-in");
  setTimeout(() => content.classList.remove("cm-template-in"), 260);
}

// Sets a `key: true` frontmatter flag (creating the block if missing), touching
// only the frontmatter range so the cursor and the body stay put.
export function setFrontmatterFlag(view: EditorView, key: string) {
  const match = FM_REGEX.exec(view.state.doc.toString());
  if (!match) {
    view.dispatch({ changes: { from: 0, insert: `---\n${key}: true\n---\n\n` }, userEvent: "input.frontmatter" });
    return;
  }
  replaceFrontmatter(view, match[0], updateFmFields(match[0], { [key]: "true" }));
}

// Removes every sensitive marker (flags and tags), the inverse of setFrontmatterFlag.
export function clearFrontmatterSensitive(view: EditorView) {
  const match = FM_REGEX.exec(view.state.doc.toString());
  if (match) replaceFrontmatter(view, match[0], clearSensitiveMarkers(match[0]));
}

function replaceFrontmatter(view: EditorView, block: string, insert: string) {
  if (insert === block) return;
  view.dispatch({ changes: { from: 0, to: block.length, insert }, userEvent: "input.frontmatter" });
}

const FRONTMATTER_FLAG_SENTINELS: Record<string, string> = {
  [MARK_SENSITIVE_SENTINEL]: "sensitive",
  [MARK_PRIVATE_SENTINEL]: "private",
};

const DEFAULT_TABLE =
  `| ${CURSOR_SENTINEL}Header 1 | Header 2 | Header 3 |\n` +
  `| -------- | -------- | -------- |\n` +
  `|          |          |          |\n` +
  `|          |          |          |`;

export function applyTemplate(
  view: EditorView,
  from: number,
  to: number,
  content: string,
  callbacks: SlashMenuCallbacks,
) {
  if (content === LINK_EDITOR_SENTINEL) {
    callbacks.onOpenLinkDialog({ from, to });
    return;
  }
  if (content === WIKILINK_EDITOR_SENTINEL) {
    callbacks.onOpenWikiLinkDialog({ from, to });
    return;
  }
  if (content === DATE_EDITOR_SENTINEL) {
    callbacks.onOpenDatePicker({ from, to });
    return;
  }
  if (content === FRONTMATTER_WIZARD_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    callbacks.onFrontmatterWizard();
    return;
  }
  if (content === TASK_EDITOR_SENTINEL) {
    callbacks.onOpenTaskDialog({ from, to });
    return;
  }
  if (content === AI_CHAT_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    callbacks.onOpenAIChat?.();
    return;
  }
  if (content === VAULT_TEMPLATE_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    callbacks.onInsertVaultTemplate?.();
    return;
  }
  if (content === SAVE_AS_TEMPLATE_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    callbacks.onSaveAsTemplate?.();
    return;
  }
  if (content === TEMPLATE_FIELD_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    callbacks.onInsertTemplateField?.();
    return;
  }
  const flagKey = FRONTMATTER_FLAG_SENTINELS[content];
  if (flagKey) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    setFrontmatterFlag(view, flagKey);
    return;
  }
  if (content === MARK_PUBLIC_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    clearFrontmatterSensitive(view);
    return;
  }
  if (content === TABLE_DIALOG_SENTINEL) {
    insertPlainContent(view, from, to, DEFAULT_TABLE);
    return;
  }
  const cursorPos = insertPlainContent(view, from, to, content);
  if (content === CODE_BLOCK_TEMPLATE_CONTENT) callbacks.onCodeBlockInserted(cursorPos);
}

// A "path-like" trigger (e.g. "/Users/name", "./foo") shouldn't pop the
// slash-command menu — same guard as the old handleSlashMenuTrigger.
function looksLikePath(textFromSlash: string): boolean {
  return (
    /^\/(Users|home|tmp|etc|var|usr|bin|opt|dev|proc|sys|sbin|lib|local|mnt|media|srv|run|root|C:)(\/|$)/i.test(textFromSlash) ||
    /^\/[a-zA-Z0-9._-]+\//.test(textFromSlash) ||
    textFromSlash.startsWith("./") ||
    textFromSlash.startsWith("../")
  );
}

export function createSlashMenuSource(callbacksRef: { current: SlashMenuCallbacks }) {
  return (context: CompletionContext): CompletionResult | null => {
    const pos = context.pos;
    const line = context.state.doc.lineAt(pos);
    const textUpToCursor = line.text.slice(0, pos - line.from);
    const slashIndex = textUpToCursor.lastIndexOf("/");
    if (slashIndex === -1) return null;

    const validBoundary = slashIndex === 0 || textUpToCursor[slashIndex - 1] === " ";
    if (!validBoundary) return null;

    const query = textUpToCursor.slice(slashIndex + 1);
    if (query.includes(" ")) return null;
    if (looksLikePath(textUpToCursor.slice(slashIndex))) return null;

    const templates = [
      ...AVAILABLE_TEMPLATES,
      ...(callbacksRef.current.onInsertVaultTemplate ? VAULT_TEMPLATE_ENTRIES : []),
      ...(callbacksRef.current.onInsertTemplateField ? TEMPLATE_FIELD_ENTRIES : []),
      ...(callbacksRef.current.onSaveAsTemplate ? SAVE_TEMPLATE_ENTRIES : []),
      ...(callbacksRef.current.onOpenAIChat ? TEMPLATES.filter((template) => template.content === AI_CHAT_SENTINEL) : []),
    ];
    // Offer only the privacy commands that would change this note.
    const sensitive = isSensitiveContent(context.state.doc.toString());
    const hidden = sensitive ? [MARK_SENSITIVE_SENTINEL, MARK_PRIVATE_SENTINEL] : [MARK_PUBLIC_SENTINEL];
    const matches = templates.filter((t) => !hidden.includes(t.content) && fuzzyMatch(t.label, query));
    if (matches.length === 0) return null;

    const from = line.from + slashIndex;
    const options: Completion[] = matches.map((t) => ({
      label: t.label,
      detail: t.description,
      apply: (view, _completion, applyFrom, applyTo) => {
        applyTemplate(view, applyFrom, applyTo, t.content, callbacksRef.current);
      },
    }));

    return { from, to: pos, options, filter: false };
  };
}
