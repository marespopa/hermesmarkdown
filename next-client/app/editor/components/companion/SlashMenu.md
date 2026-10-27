# SlashMenu

Description: The `/` menu above the companion's input. Lists the companion's own commands (`COMPANION_COMMAND_LIST`: /new, /clear, /compact, /summarize, /summarise) and the skills (`useChatSkills().skillList()`), filtered by the text after the slash. Same look as `MentionMenu`.

## Props
| Prop | Type | Description |
|---|---|---|
| options | `SlashOption[]` | `{ command, description? }` rows, already filtered |
| activeIndex | `number` | The highlighted row (arrow keys in the composer) |
| onSelect | `(option) => void` | Picked with the mouse; on mousedown so the field keeps focus |
