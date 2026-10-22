---
state: approved
size: normal
kind: feature
blocked_from:
rejections: 1
created: 2026-10-22T17:43:28Z
---

# Token-level syntax reveal: instead of showing every Markdown mark on the

## Desired behavior
Token-level syntax reveal: instead of showing every Markdown mark on the whole caret line, reveal a mark only when the caret or selection touches its token (e.g. the ** around the bold word under the caret, the [] of the link under it); the rest of the line stays rendered, so moving past one bold word doesn't shift the line. Heading lines keep their heading font size while the caret is in them (the # marks reveal in the margin as today, the line never collapses to body size). Hide/reveal ranges must match tokens exactly so typing a space or punctuation next to a mark doesn't break parsing or flicker. Builds on the 2026-10-18 caret-line reveal; never name other editors in code or docs.

## Out of scope
Anything the request doesn't ask for.
