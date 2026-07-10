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
  CURSOR_SENTINEL,
} from "../components/constants";

// Non-AI templates only — AI action entries (aiOnly: true) aren't ported in
// this pass (that's a separate AI-subsystem port, not part of the CM6
// migration). Frontmatter wizard, Link/WikiLink/Date/Table sentinels are.
const AVAILABLE_TEMPLATES = TEMPLATES.filter((t) => !t.aiOnly);

export interface SlashMenuCallbacks {
  onOpenLinkDialog: (range: { from: number; to: number }) => void;
  onOpenWikiLinkDialog: (range: { from: number; to: number }) => void;
  onOpenDatePicker: (range: { from: number; to: number }) => void;
  onFrontmatterWizard: () => void;
}

function fuzzyMatch(label: string, query: string): boolean {
  if (!query) return true;
  const hay = label.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let hi = 0; hi < hay.length && qi < q.length; hi++) {
    if (hay[hi] === q[qi]) qi++;
  }
  return qi === q.length;
}

function insertPlainContent(view: EditorView, from: number, to: number, content: string) {
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
}

const DEFAULT_TABLE =
  `| ${CURSOR_SENTINEL}Header 1 | Header 2 | Header 3 |\n` +
  `| -------- | -------- | -------- |\n` +
  `|          |          |          |\n` +
  `|          |          |          |`;

function applyTemplate(
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
  if (content === TABLE_DIALOG_SENTINEL) {
    insertPlainContent(view, from, to, DEFAULT_TABLE);
    return;
  }
  insertPlainContent(view, from, to, content);
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

    const matches = AVAILABLE_TEMPLATES.filter((t) => fuzzyMatch(t.label, query));
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
