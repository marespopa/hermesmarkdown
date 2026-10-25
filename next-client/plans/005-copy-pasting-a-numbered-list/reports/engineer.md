# Engineer report: numbered list paste

**Built:** Root cause: the HTML→Markdown converter escaped `^\d+\. ` to `2\. `. The paste handler only falls back to plain text when the result is purely escapes, so `2. **Title**` (markup plus escape) kept `2\. `. Fix: removed the numeric escape rule from ESCAPES in `app/tools/cleaner/html-to-markdown.ts`.
**Tests:** `app/tools/cleaner/html-to-markdown.test.ts`, new case "keeps a typed list number as copied" (failed before the fix). Ran cleaner + html-paste tests: 55 pass.
**Decisions:** A typed `2. Title` paragraph now pastes as `2. Title` (a list item in the editor), matching "keep numbers exactly as copied". `onlyEscapesPlain` untouched.
**Not done:** no docs change needed.
