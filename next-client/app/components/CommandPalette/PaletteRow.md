# PaletteRow

Description: One option in the command palette's result list (`role="option"`, `id="command-palette-option-<index>"`), drawn as a `Button variant="menu-item"`. Extracted from `CommandPalette.tsx`.

## Layout
- Single-line rows (files, commands, tasks, headings, templates, create): a neutral leading icon (`rowIcon`: by kind, by id for the top-level menu, by category for other commands; `text-fg` when selected), the label with `HighlightedText`, a `PrivateBadge` lock for private files and masked tasks, optional context (a command's `disabledReason`, or in a menu its `description`; a task's `path:line`, a `#tag` result's matched tags), the parent folder (a template's pack) right-aligned, and a command's shortcut as a key cap (`SEARCH_KBD_CLASS`) or a spinner while it runs, then a chevron on a command that opens a menu (`subcommands`), an arrow on one that opens another page (`opens: "page"`) or the external mark on one that opens a new tab (`opens: "tab"`, which also adds "(opens in a new tab)" to the accessible name).
- Content rows (`/` note text): two lines. First the snippet of the matching line, with every term occurrence highlighted. Second, `name:line` with the parent folder right-aligned. They grow to fit both lines (`min-h-10`, `min-h-11` on mobile chrome).
- Selected and hovered rows use translucent fills (`bg-black/[0.06]`, `bg-white/[0.09]` in dark) with a `border-edge-subtle` hairline, so the palette's glass (`.glass-panel`) shows through them.

## Accessibility
- Accessible name: the label (or "Private task"), "(private)" for private files, the context, `name:line` for content rows, and the folder.
- `aria-selected`, `aria-disabled` for disabled commands, `aria-busy` while a command runs.

## Props
| Prop | Type | Description |
|---|---|---|
| `row` | `Row` | The row to draw (`palette-model.tsx`) |
| `index` | `number` | Position, for the option id |
| `selected` | `boolean` | Keyboard / hover selection |
| `scope` | `Scope \| null` | The active prefix scope (tag rows show tags as context) |
| `inMenu` | `boolean` | Inside a menu: command rows show their `description` as context |
| `runningId` | `string \| null` | Row id of a running command; disables every row meanwhile |
| `isMobileChrome` | `boolean` | Taller minimum row height |
| `onExecute` | `(row) => void` | Click |
| `onHover` | `(index) => void` | Mouse enter selects the row |
| `onContextMenu` | `(row) => void` | Right-click on file and command rows only (pin menu) |

## Dependencies
- `Button`, `PrivateBadge`, `HighlightedText` / `parentFolder` from `palette-model`, `react-icons`. No state, no side effects.
