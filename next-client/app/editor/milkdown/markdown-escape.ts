// mdast-util-to-markdown escapes a literal "[" wherever it could be
// mistaken for the start of link/reference syntax on a future parse.
// Two shapes of that bite us here, since both are just plain text to the
// schema (no dedicated node/mark) rather than something the serializer
// recognizes and re-emits verbatim:
//   - callout markers ("> [!note]") at the start of a blockquote line
//   - wikilinks ("[[Name]]") anywhere inline — only the opening "[[" gets
//     escaped, not the closing "]]"
// Left alone, a Milkdown serialization would rewrite these to "> \[!note]"
// and "\[\[Name]]" — breaking recognition in codemirror/highlight.ts,
// CalloutBlockquoteView, and the wikilink-click plugin's own regex, none of
// which know about the escape. Undone here, right before the markdown
// leaves Milkdown (both on save and on copy), so it stays in the canonical
// form every other surface expects.
//
// Also strips Milkdown's own "preserve empty line" placeholder: its
// paragraph serializer (preset-commonmark's paragraphSchema.toMarkdown)
// deliberately writes a literal "<br />" for any structurally-empty,
// non-top-level-last paragraph (an empty task item, an empty callout body
// line, …) so the blank line survives a markdown round-trip. That's
// intentional upstream behavior — disabling it outright was tried and
// rejected, since it makes empty GFM task items lose their "[ ] " checkbox
// marker entirely on save — but literal "<br />" showing up in saved or
// copied text reads as a bug, not a feature, from the user's side. Stripped
// here only when it's the last thing on its line (so a legitimate
// hand-typed "<br>" line break in the *middle* of a GFM table cell, the one
// case HtmlPassthroughView still renders on load, survives); the structural
// blank line itself collapses to nothing on the next parse, same as
// leaving any other consecutive blank line non-preserved.
//
// One case is deliberately exempt: a GFM task item whose "<br />" is the
// ONLY thing after "[ ]"/"[x]" — verified directly against
// @milkdown/preset-gfm's own parser that an empty checkbox with nothing
// after it ("- [ ] " with any amount of trailing whitespace, no "<br />")
// is not recognized as a task item at all on the next parse; it silently
// degrades to a plain bullet whose text literally reads "[ ]", losing the
// checkbox entirely. That's a worse, silent-corruption failure mode than a
// visible "<br />", so this one case keeps it — every other empty-line
// placeholder (plain paragraphs, callout body lines, non-task list items)
// is stripped unconditionally.
const TASK_CHECKBOX_ONLY_BR = /\[[ xX]\]\s*<br \/>[ \t]*$/;

export function unescapeKnownMarkdownPatterns(markdown: string): string {
  const withEscapesFixed = markdown
    .replace(/^((?:>\s*)+)\\\[!/gm, "$1[!")
    .replace(/\\\[\\\[([^\]]+)\]\]/g, "[[$1]]");
  return withEscapesFixed
    .split("\n")
    .map((line) => (TASK_CHECKBOX_ONLY_BR.test(line) ? line : line.replace(/<br \/>[ \t]*$/, "")))
    .join("\n");
}

// Render/Preview mode is WYSIWYG: a heading looks like large bold text with
// no "#", a bold word looks bold with no "**", a callout looks like a
// bordered box with no "> ". Milkdown's remark serializer doesn't know any
// of that — clipboardTextSerializer always re-renders a copied selection
// back to its raw markdown source, so selecting and copying what's visibly
// just "key1" inside a callout used to land on the clipboard as "> key1",
// a bold word as "**word**", a heading as "## Heading", a link's label as
// "[label](https://...)". Right-clicking a selection offers an explicit
// "Copy source" for when the markdown *is* wanted (see the editor's
// context menu); plain copy (Ctrl+C) should match what the eye actually
// selected. This walks the serialized markdown back down to that visible
// text, on the clipboard path only — never in unescapeKnownMarkdownPatterns
// above, since that one also runs on save and the saved file must keep its
// real markdown syntax.
const CALLOUT_MARKER_LINE = /^\[!\w+\]([+-]?)\s*.*$/i;
const FENCE_LINE = /^(?:```|~~~)/;
const TASK_ITEM = /^(\s*)-\s\[([ xX])\]\s+/;
const UNORDERED_ITEM = /^(\s*)[-*+]\s+/;
const ORDERED_ITEM = /^(\s*)\d+[.)]\s+/;
const LEADING_HEADING = /^#{1,6}\s+/;
const LEADING_BLOCKQUOTE = /^(?:>\s?)+/;

// plugins.ts's serializeSliceToMarkdown rebuilds its slice with
// `doc.slice(from, to)` precisely so a selection contained in one block
// never picks up that block's own wrapper (see the doc comment there), but
// a selection that starts partway into one block and continues into a
// fully-selected sibling still forces that boundary block's node — and
// with it its marker ("- [ ] ", "## ", "> ", an opening ```fence — back
// into the reconstructed doc, on a line whose actual selected text never
// included it. Called only when the caller has confirmed (via the original
// selection's $from.parentOffset) that the selection didn't start at that
// block's own beginning, so the marker is spurious rather than genuinely
// selected. A fence marker sits alone on its own line, so it's dropped
// outright rather than trimmed as a same-line prefix.
export function stripSpuriousLeadingMarker(markdown: string): string {
  const lines = markdown.split("\n");
  if (FENCE_LINE.test(lines[0] ?? "")) {
    lines.shift();
    return lines.join("\n");
  }
  let first = lines[0] ?? "";
  first = first.replace(LEADING_BLOCKQUOTE, "").replace(LEADING_HEADING, "");
  const task = first.match(TASK_ITEM);
  first = task ? first.slice(task[0].length) : first.replace(UNORDERED_ITEM, "").replace(ORDERED_ITEM, "");
  lines[0] = first;
  return lines.join("\n");
}

// Symmetric case: a selection that ends partway into a block and continues
// back from a fully-selected sibling forces that boundary block's closing
// syntax back in even though the selection never reached it — the only
// marker type in this schema with a *closing* line is a fenced code
// block's trailing ```. Same trigger as stripSpuriousLeadingMarker, mirrored
// against $to.parentOffset instead of $from's.
export function stripSpuriousTrailingMarker(markdown: string): string {
  const lines = markdown.split("\n");
  if (FENCE_LINE.test(lines[lines.length - 1] ?? "")) lines.pop();
  return lines.join("\n");
}

// Order matters: images before links (image syntax is a strict superset),
// bold before italic (an unstripped "**" would otherwise parse as two
// stray "*" italics), and the backslash-escape unwind last, since the
// upstream escapes (e.g. "\*", "\[") only mean anything once every real
// piece of formatting syntax around them is already gone.
function stripInlineMarkdown(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+?)\*\*/g, "$1")
    .replace(/__([^_]+?)__/g, "$1")
    .replace(/~~([^~]+?)~~/g, "$1")
    .replace(/(?<![*\w])\*([^*]+?)\*(?!\w)/g, "$1")
    .replace(/(?<![_\w])_([^_]+?)_(?!\w)/g, "$1")
    .replace(/`([^`]+?)`/g, "$1")
    .replace(/\\([\\*_[\]~`#>])/g, "$1");
}

export function markdownToVisibleText(markdown: string): string {
  const rawLines = markdown.split("\n").map((line) => line.replace(/^(?:>\s?)+/, ""));
  if (rawLines.length && CALLOUT_MARKER_LINE.test(rawLines[0])) rawLines.shift();

  let inFence = false;
  const lines = rawLines.map((line) => {
    if (FENCE_LINE.test(line)) {
      inFence = !inFence;
      return null;
    }
    if (inFence) return line;

    let text = line.replace(/^(\s*)#{1,6}\s+/, "$1");
    const task = text.match(TASK_ITEM);
    if (task) {
      const checked = task[2].toLowerCase() === "x";
      text = `${task[1]}${checked ? "☑" : "☐"} ${text.slice(task[0].length)}`;
    } else {
      text = text.replace(UNORDERED_ITEM, "$1• ");
    }
    return stripInlineMarkdown(text);
  });

  return lines.filter((line): line is string => line !== null).join("\n");
}
