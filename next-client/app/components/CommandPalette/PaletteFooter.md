# PaletteFooter

Description: The command palette's foot and its legend: one chip per search mode (`SCOPES` in `palette-model`, in order: `#` Tags, `!` Tasks, `@` Headings, `/` Text, `~` Templates, `>` Commands), each with its prefix in a key cap, then the version. Clicking a chip does what typing its prefix does; the mode in use is lit (`aria-pressed`, the accent behind the key cap), and clicking it again goes back to notes. Settings and the theme aren't here: they're commands in the list (Open Settings, `Theme: …`). Extracted from `CommandPalette.tsx`.

## Props
| Prop | Type | Description |
|---|---|---|
| `scope` | `Scope \| null` | The mode in use (null: notes, or a menu is open) |
| `onScope` | `(scope) => void` | A chip was clicked; the palette toggles that mode, clears the query and any open menu, and refocuses the field |
| `regex` | `{ on, onToggle }?` | The `/` scope's Regex chip (Alt+R); left out elsewhere |
| `replace` | `{ onReplace }?` | The `/` scope's **Replace…** chip (`⇄` key cap, `aria-label="Replace in files"`), passed once a query is typed: the palette closes and opens Replace in Files with that query (and Regex when on) |

## Accessibility
- The chips are a `role="group"` named "Search modes"; each chip's name is its mode ("Tags"), its title adds the prefix.

## Dependencies
- `Button`, `SCOPES` / `Scope` from `palette-model`.
