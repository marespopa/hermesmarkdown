# PlanCard

Description: The companion's plan (`update_plan`) as a checklist card: "Plan · 2 of 5 done", then each step with a check (done), the delayed spinner (in progress) or a quiet dot (pending). `CompanionMessage` shows one per reply, at the first `update_plan` call, with the steps of the latest one, so it updates in place as the plan advances.

## Props
| Prop | Type | Description |
|---|---|---|
| steps | `PlanStep[]` | Each step's text and status (`pending`, `in_progress`, `done`) |
