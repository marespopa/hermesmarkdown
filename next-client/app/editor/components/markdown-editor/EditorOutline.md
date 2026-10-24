# EditorOutline

Description: The note's outline: a small box (`w-52`, at most `max-h-60`, the menus' panel material) fixed in the pane's bottom-right corner, listing the note's H1–H3 headings (`utils/markdown-outline.ts`'s `extractOutline`, which skips the frontmatter and fenced code) as text in the sidebar's 28px rows, indented 12px per level, H1s medium weight. In a code file (`isCode`) the rows are its symbols instead (`utils/code-outline.ts`'s `extractCodeOutline` over the editor's syntax tree): modules / namespaces, classes, structs, interfaces / traits and their methods and fields, functions, types, enums and their members, top-level constants and variables (JS / TS `const` / `let` / `var` at file level, not in callbacks; Python only `ALL_CAPS` module constants; Rust `const` / `static`), a JS / TS `export default` named by what it exports (`export default tseslint.config`, so a config file has an outline), CSS selectors, JSON / YAML keys two levels deep. C# has no syntax tree in CodeMirror (a legacy mode), so a `.cs` / `.csx` file (`filePath`) is scanned from its text instead (`utils/csharp-outline.ts`'s `extractCSharpOutline`: namespaces, types, constructors, methods, operators, properties, indexers, events, fields, constants, enum values). Each code row leads with its kind's icon (`SymbolIcon`); top-level symbols take the medium weight. Other languages without a syntax tree (shell and other legacy modes) have no outline. `useOutlineHeadings` picks the source. The section being read (the last heading above a quarter of the pane's height) is the current row (`aria-current="location"`, the sidebar's current-row fill), kept in view inside the box, which scrolls on its own for a long outline. A click puts the caret on that heading, scrolls it to a quarter of the pane's height (so it becomes current) and returns focus to the editor, then briefly flashes that line (`utils/flash-line.ts`'s `flashLine`, the same fade a Tasks or palette jump shows; skipped with reduced motion). Off by default: only mounted when **Outline** is on (`atom_showOutline`; `Ctrl/Cmd+Shift+M` in `use-editor-shortcuts.ts`, **Toggle Outline** in the palette, Settings → Editor → View). Renders nothing for a note without headings; hidden below the `md` breakpoint. It replaces the sidebar's old Outline section and the minimap that followed it.

## Local State & Storage
- State: `current` (the current row's index: several symbols can share a line, so rows are keyed and tracked by index, never by line alone), the list and row refs.
- Persistence: none here; `atom_showOutline` is `localStorage["showOutline"]`.

## Logic
- The editor scrolls in its pane (`.editor-canvas`, `paneRef`), not in CodeMirror's own scroller, so the box sits in a zero-height `sticky bottom-0` box rendered after the sheet (like `WordCountPill`), which holds it in the pane's corner, and reads the pane's scroll. It floats over the page (no room is kept for it); `VimStatusPill` steps left of it (`besideOutline`).
- The current heading comes from `view.documentTop` and `lineBlockAtHeight` against the pane's scroll, so wrapped lines and widgets count as they're drawn; it updates on the pane's `scroll` and on text changes.
- A clicked row is pinned current (`pinRef`: its line, text and the pane's `scrollTop` after the jump) until the pane scrolls more than 1px away from there or the row is gone: near the file's top or bottom the pane can't scroll the heading to the reading point, and symbols can share a line, so the scroll alone would mark a neighbour.
- Keeping the current row in view sets the box's own `scrollTop`, never `scrollIntoView`, so the pane never moves.
- A C# outline is scanned from the text 200 ms after it last changed. Any other code outline is read 200 ms after the text last changed, giving the parser at most 25 ms to finish the file (`ensureSyntaxTree`), else using what's parsed and reading again every 400 ms (up to 10 times) until the whole file is, so typing never waits on it. A note's headings come straight from its text.
- Rows keep the editor's focus on mouse down (`preventDefault`), then the click moves the caret and focuses the editor.

## Dependencies
- Core: `@codemirror/view` (`EditorView`), `@codemirror/language` (syntax tree), `Button`, `extractOutline`, `extractCodeOutline`, `extractCSharpOutline`, `flashLine`, `SymbolIcon` (`react-icons/vsc` symbol glyphs), `sidebarItemClass`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{showOutline && <EditorOutline view={editorView} scrollerRef={paneRef} text={editorValue} isCode={isPlainTextPath(filePath)} filePath={filePath} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `EditorView \| null` | | The pane's editor (line positions, the caret) |
| scrollerRef | `RefObject<HTMLDivElement \| null>` | | The pane that scrolls (`.editor-canvas`) |
| text | `string` | | The note's current text, its headings listed (for code, a change re-reads the symbols) |
| isCode | `boolean` | `false` | A code or other text file: list its symbols, not Markdown headings |
| filePath | `string \| null` | | The file's path; a `.cs` / `.csx` file's symbols come from the C# text scan |

## Symbol icons
`SymbolIcon.tsx` maps each `SymbolKind` (`utils/markdown-outline.ts`) to a VS Code symbol glyph (`react-icons/vsc`) at 14px in `SIDEBAR_ICON_CLASS` (neutral, never coloured, `aria-hidden`): namespace for modules and `impl` blocks, class (also CSS selectors), structure, interface (also traits), enum, enum member, method (functions and methods), property, field, event, constant, variable, key (JSON / YAML) and misc (type aliases, delegates). A note's headings have no kind and no icon.
