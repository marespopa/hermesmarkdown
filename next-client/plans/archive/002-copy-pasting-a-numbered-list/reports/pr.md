## Pasting a numbered list keeps its numbers
- Pasting rich text with `2. Title` no longer turns the number into `2\. Title`; numbers stay as copied.
- The HTML→Markdown converter (`html-to-markdown.ts`) no longer escapes a leading list number; the Markdown Cleaner tool shares it.
