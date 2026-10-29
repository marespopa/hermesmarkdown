# ReplaceFileSection

Description: One file of the Replace in Files preview. The header has a checkbox (includes or excludes all of the file's matches; indeterminate when mixed), the file name, its folder, the match count and an **Open** button (at the first match). Each match is a row: a checkbox, the line number (opens the file at that line and column), and the line around the match (up to 60 characters each side) with the matched text struck on the deleted tint and the replacement after it on the added tint (an empty Replace with shows only the strike). Memoized: typing in Replace with re-renders the rows, checking a match re-renders its file only. Rows get 44px hit areas on touch.

## Props
| Prop | Type | Description |
|---|---|---|
| `file` | `ReplaceFileResult` | Path, fingerprint, matches |
| `template`, `regex` | `string`, `boolean` | The replacement text; `$` tokens expand in Regex mode (`expandReplacement`) |
| `excluded` | `ReadonlySet<number>?` | Unchecked match ordinals |
| `state` | `FileState?` | While applying and after: `replacing` (dimmed, checkboxes locked), `replaced` (collapses to "Replaced N"), `skipped` ("Changed since the preview — search again"), `failed` ("Couldn't write this file") |
| `replacedCount` | `number?` | Matches written, for a replaced file |
| `onToggleMatch`, `onToggleFile`, `onOpen` | callbacks | Stable, so unchanged sections don't re-render |

## Dependencies
- `Button`, `formatCount`.
