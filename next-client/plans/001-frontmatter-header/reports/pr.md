## Frontmatter header
- A note's frontmatter shows as one quiet line of chips (type, tags, status, dates, other keys) while the caret is outside it; the caret entering the block reveals the raw YAML as typed. Complex YAML always shows raw.
- The `status` chip opens a menu and date chips open the date picker; both change only the value, as one undo step. Ctrl/Cmd+Shift+Enter on a `status:` line opens the menu.
- Notes open with the caret below the frontmatter; folding parks the caret there too.
- Wiring: the header is a state-field replace in `codemirror/frontmatter-header.ts`; frontmatter tag pills were removed from `tag-pills.ts`.
