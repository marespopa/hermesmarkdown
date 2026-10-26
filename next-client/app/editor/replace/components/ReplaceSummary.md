# ReplaceSummary

Description: What sits above the previews of Replace in Files: the count line ("N matches in M files"), the scan status ("Searching… N of M files", with a spinner, shown only after 150 ms so a quick scan shows nothing), one message for why Replace can't run ("Type what to find.", "Not a valid regular expression yet.", the stalled-pattern and "More than 5,000 matches. Narrow the search to replace." notes), "Private notes are skipped." when the vault has any, and, after a replace, a banner "Replaced N matches in M files" with a secondary **Undo** button until the next replace or a vault change. Stateless apart from the status delay.

## Props
| Prop | Type | Description |
|---|---|---|
| `searching` | `boolean` | Find has text |
| `scanning`, `scanned`, `total` | | Scan progress |
| `matchCount`, `fileCount` | `number` | The preview's totals |
| `capped`, `invalid`, `stalled` | `boolean` | Why the preview can't be applied |
| `hasPrivate` | `boolean` | Show the private-notes note |
| `banner` | `{ matches, files }?` | The last replace, for Undo |
| `onUndo`, `undoing` | | The banner's button and its disabled state |

## Dependencies
- `Button`, `formatCount`.
