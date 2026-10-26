# ReplaceForm

Description: The fields of Replace in Files: **Find** (autofocused) and **Replace with** (`BareInput` on `FIELD_CLASS`, not trimmed), the **Match case** / **Whole word** / **Regex** options as `segment` buttons (`aria-pressed`) on `SEGMENT_TRACK_CLASS`, an **Include code files** `Toggle`, and the Replace `primary` button. A form: Enter in a field presses Replace when it's enabled. Stateless; the page owns everything.

## Props
| Prop | Type | Description |
|---|---|---|
| `find`, `replaceWith` | `string` | The field values |
| `prefs` | `ReplacePrefs` | Match case, Whole word, Regex, Include code files |
| `onFind`, `onReplaceWith`, `onPrefs` | callbacks | Changes |
| `label` | `string` | The button text ("Replace 3 matches in 2 files", "Replacing… 1 of 2") |
| `disabled`, `busy` | `boolean` | Button state; `busy` sets `aria-busy` |
| `onReplace` | `() => void` | The button, or Enter |

## Dependencies
- `Button`, `BareInput`, `FIELD_CLASS`, `Toggle`.
