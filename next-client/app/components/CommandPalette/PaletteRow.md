# PaletteRow

Description: One option in the command palette's result list (`role="option"`, `id="command-palette-option-<index>"`), drawn as a `Button variant="menu-item"`. Extracted from `CommandPalette.tsx`.

## Layout
- Single-line rows (files, commands, tasks, headings, create): the label with `HighlightedText`, a `SensitiveBadge` lock for sensitive files and masked tasks, optional context (a command's `disabledReason`, a task's `path:line`, a `#tag` result's matched tags), the parent folder right-aligned, and a command's shortcut or a spinner while it runs.
- Content rows (`/` note text): two lines. First the snippet of the matching line, with every term occurrence highlighted. Second, `name:line` with the parent folder right-aligned. They grow to fit both lines (`min-h-10`, `min-h-11` on mobile chrome).
- Selected rows use `bg-chrome` / `border-edge`; tokens only.

## Accessibility
- Accessible name: the label (or "Sensitive task"), "(sensitive)" for sensitive files, the context, `name:line` for content rows, and the folder.
- `aria-selected`, `aria-disabled` for disabled commands, `aria-busy` while a command runs.

## Props
| Prop | Type | Description |
|---|---|---|
| `row` | `Row` | The row to draw (`palette-model.tsx`) |
| `index` | `number` | Position, for the option id |
| `selected` | `boolean` | Keyboard / hover selection |
| `scope` | `Scope \| null` | The active prefix scope (tag rows show tags as context) |
| `runningId` | `string \| null` | Row id of a running command; disables every row meanwhile |
| `isMobileChrome` | `boolean` | Taller minimum row height |
| `onExecute` | `(row) => void` | Click |
| `onHover` | `(index) => void` | Mouse enter selects the row |
| `onContextMenu` | `(row) => void` | Right-click on file and command rows only (pin menu) |

## Dependencies
- `Button`, `SensitiveBadge`, `HighlightedText` / `parentFolder` from `palette-model`, `react-icons`. No state, no side effects.
