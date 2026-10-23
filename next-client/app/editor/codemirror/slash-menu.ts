import { CompletionContext, CompletionResult, Completion, startCompletion } from "@codemirror/autocomplete";
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
  BOARD_LINK_SENTINEL,
  EMBED_FILE_SENTINEL,
  EMOJI_PICKER_SENTINEL,
  CURSOR_SENTINEL,
  CODE_BLOCK_TEMPLATE_CONTENT,
  MARK_PRIVATE_SENTINEL,
  MARK_PUBLIC_SENTINEL,
} from "../components/constants";
import { FM_REGEX, updateFmFields } from "@/app/utils/frontmatter-utils";
import type { FrontmatterCompletionCallbacks } from "./frontmatter-completion";
import { requestCalloutTypeMenu } from "./callout-type";
import { clearPrivateMarkers, isPrivateContent } from "@/app/utils/note-privacy";
import { applyBlockCommand, BLOCK_COMMANDS, rankSlashCommands, slashSection } from "./slash-commands";

// The slash menu stays short: insertions and a few note-level commands. AI
// is one entry, AI Chat (added only when AI is set up); the one-click AI
// actions are palette commands. The vault Template entry is added only when the editor can insert one, and
// Template field only while editing a template.
const AVAILABLE_TEMPLATES = TEMPLATES.filter((t) => !t.aiOnly && !t.vaultOnly && !t.templateOnly && !t.saveTemplateOnly && !t.boardOnly && !t.embedOnly);
const VAULT_TEMPLATE_ENTRIES = TEMPLATES.filter((t) => t.content === VAULT_TEMPLATE_SENTINEL);
const TEMPLATE_FIELD_ENTRIES = TEMPLATES.filter((t) => t.templateOnly);
const SAVE_TEMPLATE_ENTRIES = TEMPLATES.filter((t) => t.saveTemplateOnly);
const BOARD_ENTRIES = TEMPLATES.filter((t) => t.boardOnly);
const EMBED_ENTRIES = TEMPLATES.filter((t) => t.embedOnly);

export interface SlashMenuCallbacks extends FrontmatterCompletionCallbacks {
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
  /** Creates a board and links it at the caret; set with a vault. The trigger text is already removed. */
  onInsertBoard?: () => void;
  /** Vault paths of the notes `/name` can embed; set with a vault. */
  embedFiles?: () => string[];
  onFrontmatterWizard: () => void;
  onCodeBlockInserted: (pos: number) => void;
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

// Removes the private marker (flag and tag), the inverse of setFrontmatterFlag.
export function clearFrontmatterPrivate(view: EditorView) {
  const match = FM_REGEX.exec(view.state.doc.toString());
  if (match) replaceFrontmatter(view, match[0], clearPrivateMarkers(match[0]));
}

function replaceFrontmatter(view: EditorView, block: string, insert: string) {
  if (insert === block) return;
  view.dispatch({ changes: { from: 0, to: block.length, insert }, userEvent: "input.frontmatter" });
}

const FRONTMATTER_FLAG_SENTINELS: Record<string, string> = {
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
  if (content === BOARD_LINK_SENTINEL) {
    view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.replace.template" });
    callbacks.onInsertBoard?.();
    return;
  }
  if (content === EMBED_FILE_SENTINEL) {
    insertEmbedPrompt(view, from, to);
    return;
  }
  if (content === EMOJI_PICKER_SENTINEL) {
    insertEmojiPrompt(view, from, to);
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
    clearFrontmatterPrivate(view);
    return;
  }
  if (content === TABLE_DIALOG_SENTINEL) {
    insertPlainContent(view, from, to, DEFAULT_TABLE);
    return;
  }
  const cursorPos = insertPlainContent(view, from, to, content);
  if (content === CODE_BLOCK_TEMPLATE_CONTENT) callbacks.onCodeBlockInserted(cursorPos);
  // A new callout offers its type straight away, once the key press that
  // picked it is over: the menu takes focus, and must not take that key.
  if (content.startsWith("> [!")) {
    setTimeout(() => {
      if (view.dom.isConnected) requestCalloutTypeMenu(view, { pos: view.state.selection.main.head });
    }, 0);
  }
}

// "Embed file": an embed is a line of its own holding `/path`, so the
// command leaves a bare `/` on its own line (breaking the line around it when
// there's text either side) and reopens the menu there, which then lists the
// vault's notes as you type a name; a typed path (`/data/sales.csv`,
// `/assets/chart.png`) embeds any other file.
export function insertEmbedPrompt(view: EditorView, from: number, to: number) {
  const line = view.state.doc.lineAt(from);
  const before = view.state.sliceDoc(line.from, from).trim() ? "\n" : "";
  const after = view.state.sliceDoc(to, line.to).trim() ? "\n" : "";
  const insert = `${before}/${after}`;
  const caret = from + before.length + 1;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(caret),
    userEvent: "input.replace.template",
  });
  // After the key press that picked the command, so the menu opens anew.
  setTimeout(() => {
    if (view.dom.isConnected) startCompletion(view);
  }, 0);
}

// "Emoji": leaves a `{` where the trigger was and opens the emoji menu
// there (codemirror/emoji-completion.ts), once the picking key press is over.
export function insertEmojiPrompt(view: EditorView, from: number, to: number) {
  view.dispatch({
    changes: { from, to, insert: "{" },
    selection: EditorSelection.cursor(from + 1),
    userEvent: "input.replace.template",
  });
  setTimeout(() => {
    if (view.dom.isConnected) startCompletion(view);
  }, 0);
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

const MAX_FILE_OPTIONS = 8;

// Notes whose name matches what follows a `/` at the start of a line, for
// embedding as `/path.md` (utils/note-embeds.ts): names starting with the
// query first, then names containing it, then paths containing it.
export function matchEmbedFiles(paths: string[], query: string): string[] {
  const q = query.toLowerCase().replace(/\.md$/, "");
  if (!q) return [];
  const scored: [number, string][] = [];
  for (const path of paths) {
    const lower = path.toLowerCase();
    const name = lower.split("/").pop()!.replace(/\.md$/, "");
    const score = name.startsWith(q) ? 0 : name.includes(q) ? 1 : lower.includes(q) ? 2 : -1;
    if (score >= 0) scored.push([score, path]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].length - b[1].length || a[1].localeCompare(b[1]))
    .slice(0, MAX_FILE_OPTIONS)
    .map(([, path]) => path);
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
    // `/name` alone on a line also offers notes to embed; their names may
    // hold spaces and folders, so those matches keep the menu open.
    const atLineStart = textUpToCursor.slice(0, slashIndex).trim() === "";
    const embedFiles = atLineStart && callbacksRef.current.embedFiles
      ? matchEmbedFiles(callbacksRef.current.embedFiles(), query)
      : [];
    const from = line.from + slashIndex;
    const fileOptions: Completion[] = embedFiles.map((path) => ({
      label: path.split("/").pop()!.replace(/\.md$/, ""),
      detail: path.includes("/") ? `Embed · ${path.split("/").slice(0, -1).join("/")}` : "Embed note",
      apply: (view, _completion, applyFrom, applyTo) => {
        const insert = `/${path}`;
        view.dispatch({
          changes: { from: applyFrom, to: applyTo, insert },
          selection: EditorSelection.cursor(applyFrom + insert.length),
          userEvent: "input.complete",
        });
      },
    }));
    if (query.includes(" ") || looksLikePath(textUpToCursor.slice(slashIndex))) {
      return fileOptions.length ? { from, to: pos, options: fileOptions, filter: false } : null;
    }

    const templates = [
      ...AVAILABLE_TEMPLATES,
      ...(callbacksRef.current.onInsertVaultTemplate ? VAULT_TEMPLATE_ENTRIES : []),
      ...(callbacksRef.current.onInsertTemplateField ? TEMPLATE_FIELD_ENTRIES : []),
      ...(callbacksRef.current.onSaveAsTemplate ? SAVE_TEMPLATE_ENTRIES : []),
      ...(callbacksRef.current.onInsertBoard ? BOARD_ENTRIES : []),
      // Only with notes to embed (a vault is open).
      ...(callbacksRef.current.embedFiles?.().length ? EMBED_ENTRIES : []),
      ...(callbacksRef.current.onOpenAIChat ? TEMPLATES.filter((template) => template.content === AI_CHAT_SENTINEL) : []),
    ];
    // Offer only the privacy commands that would change this note.
    const isPrivate = isPrivateContent(context.state.doc.toString());
    const hidden = isPrivate ? [MARK_PRIVATE_SENTINEL] : [MARK_PUBLIC_SENTINEL];
    const commands = [...BLOCK_COMMANDS, ...templates.filter((t) => !hidden.includes(t.content))];
    const matches = rankSlashCommands(commands, query);
    if (matches.length === 0 && fileOptions.length === 0) return null;

    // Sections only for the whole list; a search shows the best match first.
    const options: Completion[] = matches.map((command) => ({
      label: command.label,
      detail: command.description,
      ...(query ? {} : { section: slashSection(command) }),
      apply: (view, _completion, applyFrom, applyTo) => {
        if ("block" in command && command.block) applyBlockCommand(view, applyFrom, applyTo, command.block);
        else if ("content" in command) applyTemplate(view, applyFrom, applyTo, command.content, callbacksRef.current);
      },
    }));

    return { from, to: pos, options: [...options, ...fileOptions], filter: false };
  };
}
