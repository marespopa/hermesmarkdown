# ToolActivityChip

Description: One tool call as a quiet line: the runner's label once it ran ("Edited Roadmap.md · 1 edit"), else what was asked. It shows the moment the call arrives; the spinner waits `SPINNER_DELAY_MS` (300 ms) so quick reads never flash it. Done shows a check; failed an exclamation mark.

## Props
| Prop | Type | Description |
|---|---|---|
| view | `ToolPartView` | toolName, state (`running`, `done`, `failed`), input |
| activity | `string?` | The runner's label |
