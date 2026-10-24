## Token-level syntax reveal
- Bold, italic, strike and inline-code marks show only while the caret or selection touches their word or span (edges included); the rest of the line stays rendered.
- Heading `#`s and quote/callout `>`s still show on the caret's line, and headings keep their size.
- `buildSyntaxRevealDecorations` now takes `revealAt(state, hasFocus)`; `activeLines` stays for details-fold.
