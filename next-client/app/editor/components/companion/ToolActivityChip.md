# ToolActivityChip

Description: One tool call as a quiet line: the runner's label once it ran ("Edited Roadmap.md · 1 edit"), else what was asked. It shows the moment the call arrives; the spinner waits `SPINNER_DELAY_MS` (300 ms) so quick reads never flash it. Done shows a check; failed an exclamation mark. `CompanionMessage` shows it for a call still waiting, and for the finished and failed ones behind "Show N steps". Also exports `DelayedSpinner`, the same delayed spinner used by the thread's working line.

## Props
| Prop | Type | Description |
|---|---|---|
| view | `ToolPartView` | toolName, state (`running`, `done`, `failed`), input |
| activity | `string?` | The runner's label |
