import { CALLOUT_META } from "@/app/editor/constants/callouts";
import { TASK_STATUSES, TASK_STATUS_CHAR, TASK_STATUS_LABEL } from "@/app/utils/task-status";

// What the AI features need to know about HermesMarkdown's own Markdown:
// tasks, links, tags and callouts. Like formula-ai-guide.ts,
// the parts that can drift (status characters, callout types) are read from the app's constants, so the prompts can't advertise
// syntax the app doesn't read.

export const TASK_STATUS_LINES = TASK_STATUSES.map(
  (status) => `  - [${TASK_STATUS_CHAR[status]}] ${TASK_STATUS_LABEL[status]}`,
).join("\n");

export const CALLOUT_TYPE_NAMES = Object.keys(CALLOUT_META);

// For every AI action that rewrites existing text.
export const SYNTAX_PRESERVATION_RULE =
  "Keep HermesMarkdown syntax exactly as written: task boxes ([ ], [/], [!], [x], [-]) and their @due(), @priority(), @started() and @done() annotations, [[wiki links]], #tags, callout headers (> [!note]) and HTML comment lines.";

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
Templates: notes are often made from the user's templates (in the templates folder, grouped into packs by subfolder). A dated note such as 2026-10-12.md is just a note a template named; the app gives it no special meaning.`;
