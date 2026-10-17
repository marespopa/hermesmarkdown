import { EditorSelection, type EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { showActionToast } from "@/app/components/Toastr";
import { hasMarkdownStructure } from "@/app/tools/cleaner/html-structure";

// Pasting rich text (a web page, Google Docs, Word, a mail) converts its
// HTML to Markdown with the Markdown Cleaner's pipeline (the Free Tools'
// converter, then its clean pass): headings, lists, links, tables, bold and
// italics arrive as Markdown instead of flat text. A toast offers "Paste as
// plain text", which swaps the result back for the clipboard's plain text.
// Left to the normal paste: HTML with no structure (a code editor's copy),
// a bare URL (the link paste), pastes into code, and when the converted
// Markdown is just the plain text. Shift+Cmd/Ctrl+V pastes plain text as
// usual (the browser leaves the HTML out).

const REGEX_BARE_URL = /^https?:\/\/\S+$/;
const CODE_NODES = new Set(["FencedCode", "CodeBlock", "InlineCode", "CodeText"]);

export function inCode(state: EditorState, pos: number): boolean {
  let node: { name: string; parent: unknown } | null = syntaxTree(state).resolveInner(pos, -1);
  while (node) {
    if (CODE_NODES.has(node.name)) return true;
    node = node.parent as typeof node;
  }
  return false;
}

/** Whether a paste of `html` (with `plain` as its text) is converted at `pos`. */
export function shouldConvertHtmlPaste(state: EditorState, pos: number, html: string, plain: string): boolean {
  if (!html.trim() || !plain.trim() || !hasMarkdownStructure(html)) return false;
  if (REGEX_BARE_URL.test(plain.trim())) return false;
  return !inCode(state, pos);
}

export interface HtmlPasteOptions {
  /** The converter (loaded on first use, so the editor doesn't carry turndown). */
  convert?: (html: string) => Promise<string>;
  /** Shown after a converted paste; `revert` swaps in the plain text. */
  onConverted?: (revert: () => void) => void;
}

// Copied Markdown source (a code view, a chat's raw reply, a README) is
// already Markdown: converting it only escapes its markers (`2. Item` →
// `2\. Item`, `- [ ]` → `\- \[ \]`), so the plain text goes in instead.
const REGEX_ESCAPE = /\\([\\`*_{}[\]()#+\-.!>~=|])/g;
const words = (text: string) => text.replace(/\s+/g, " ").trim();
export function onlyEscapesPlain(markdown: string, plain: string): boolean {
  return words(markdown.replace(REGEX_ESCAPE, "$1")) === words(plain);
}

const loadConverter = async (html: string) => {
  const { convertInput } = await import("@/app/tools/cleaner/convert-input");
  return convertInput(html, "html").markdown;
};

// Handles the paste when it should convert (returns true, after
// preventDefault); the insert lands once the converter has run.
export function handleHtmlPaste(view: EditorView, event: ClipboardEvent, options: HtmlPasteOptions = {}): boolean {
  const html = event.clipboardData?.getData("text/html") ?? "";
  const plain = event.clipboardData?.getData("text/plain") ?? "";
  const range = view.state.selection.main;
  if (!shouldConvertHtmlPaste(view.state, range.from, html, plain)) return false;
  event.preventDefault();

  const insert = (text: string, userEvent: string) => {
    const { from, to } = range;
    view.dispatch(view.state.update({
      changes: { from, to, insert: text },
      selection: EditorSelection.cursor(from + text.length),
      userEvent,
      scrollIntoView: true,
    }));
    return from;
  };

  void (options.convert ?? loadConverter)(html)
    .then((converted) => converted.trim())
    .catch((err) => {
      console.warn("Paste: couldn't convert HTML", err);
      return "";
    })
    .then((markdown) => {
      if (!markdown || markdown === plain.trim() || onlyEscapesPlain(markdown, plain)) {
        insert(plain, "input.paste");
        return;
      }
      const from = insert(markdown, "input.paste.html");
      const onConverted = options.onConverted ?? ((revert: () => void) => showActionToast("Pasted as Markdown", "Paste as plain text", revert));
      onConverted(() => {
        // Only while the pasted Markdown is still there as it was.
        if (view.state.doc.sliceString(from, from + markdown.length) !== markdown) return;
        view.dispatch(view.state.update({
          changes: { from, to: from + markdown.length, insert: plain },
          selection: EditorSelection.cursor(from + plain.length),
          userEvent: "input.paste",
        }));
      });
    });
  return true;
}
