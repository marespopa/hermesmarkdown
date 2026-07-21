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
