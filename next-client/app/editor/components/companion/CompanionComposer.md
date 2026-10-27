# CompanionComposer

Description: The companion's input, laid out as in Messages: attach, the app's own text field (`Textarea` from `app/components/Input`, the shared `FIELD_SURFACE` look: gray fill, 10px radius, soft accent focus ring), and a round send button (stop while a turn runs). Above it, one row of removable chips in one look (`ChatContextChips`): the note an entry point opened it from, the selection, @mentions (`useChatMentions`) and attachments.

## Props
| Prop | Type | Description |
|---|---|---|
| request | `CompanionRequest \| null` | A new `seq` replaces the note and selection chips and focuses the field |
| isBusy | `boolean` | Shows Stop instead of Send |
| onSend | `(text, context) => void` | |
| onStop | `() => void` | |

## Logic
- A message that is just a `/word` shows the `SlashMenu` (the companion's commands and the skills, filtered by prefix). Arrow keys move, Enter or Tab fill the command in (Enter on a command typed in full sends it), Escape closes. It stays hidden while an @mention menu is open.
- Enter sends (Shift+Enter: new line; not while composing). The field and chips clear at once; @tokens typed straight through resolve before sending. The note chip stays for the next message.
- The field grows to 160px. Attach and send sit centred in 44px slots (a one-line field's height) at the row's bottom, so they stay level with the field's last line at every pointer size.
