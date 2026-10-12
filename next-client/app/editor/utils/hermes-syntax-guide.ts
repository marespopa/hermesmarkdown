import { CALLOUT_META } from "@/app/editor/constants/callouts";
import { ROLLUP_END, ROLLUP_START } from "@/app/utils/rollup/render";
import { TASK_STATUSES, TASK_STATUS_CHAR, TASK_STATUS_LABEL } from "@/app/utils/task-status";

// What the AI features need to know about HermesMarkdown's own Markdown:
// tasks, worklog sheets, links, tags and callouts. Like formula-ai-guide.ts,
// the parts that can drift (status characters, callout types, rollup
// markers) are read from the app's constants, so the prompts can't advertise
// syntax the app doesn't read.

export const TASK_STATUS_LINES = TASK_STATUSES.map(
  (status) => `  - [${TASK_STATUS_CHAR[status]}] ${TASK_STATUS_LABEL[status]}`,
).join("\n");

export const CALLOUT_TYPE_NAMES = Object.keys(CALLOUT_META);

// For every AI action that rewrites existing text.
export const SYNTAX_PRESERVATION_RULE =
  "Keep HermesMarkdown syntax exactly as written: task boxes ([ ], [/], [!], [x], [-]) and their @due(), @priority(), @started() and @done() annotations, [[wiki links]], #tags, callout headers (> [!note]) and HTML comment lines such as the rollup:start / rollup:end markers.";

// For AI features that write note content (chat, Continue writing, new note).
export const HERMES_SYNTAX_GUIDE = `HermesMarkdown syntax (the app reads these; write them exactly like this):
Tasks:
- A task is a list item with a box. The status is the character in the box, and nothing else: never mark status with tags like #todo, #done or #blocked.
${TASK_STATUS_LINES}
- Annotations go at the end of the task line: @due(2026-10-16) for a due date (YYYY-MM-DD), @priority(high|med|low).
- @started(YYYY-MM-DD) and @done(YYYY-MM-DD) are stamped by the app when a task's status changes. Keep them when editing a task; don't add them to new tasks.
- Example: - [/] Draft the release notes @due(2026-10-16) @priority(high) #release
Links and tags:
- Link another note with [[Note name]] (its file name without .md); [[Note name|label]] shows other text.
- Tags are #word or #kebab-case, written inline in the text or in the frontmatter's tags list. Lowercase, no spaces.
Frontmatter: optional YAML between --- lines at the very top (title, tags, status, …). Keep any that exists.
Callouts: > [!type] Title on the first line, then > before every line of the body. Types: ${CALLOUT_TYPE_NAMES.join(", ")}. Add - after the type (> [!tip]- Title) to fold it.
Diagrams and math: \`\`\`mermaid fences render as diagrams; $$ … $$ blocks render as display math (KaTeX).
Worklog:
- Daily sheets are notes named by date (2026-10-12.md). They hold the day's tasks and notes.
- Rollup sheets sum up a period: weeks (2026-W42.md), months (2026-10.md), quarters (2026-Q4.md) and years (2026-year.md).
- The app rebuilds everything between the line ${ROLLUP_START} and the line ${ROLLUP_END} from the daily sheets. Never write inside that region or change those two lines: edits there are lost. Write in the sheet's Notes section, below it, instead.
- To change a task that appears in a rollup, change it in its daily sheet (the rollup links to it).`;
