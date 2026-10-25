---
state: approved
size: normal
kind: feature
blocked_from:
rejections: 1
created: 2026-10-24T15:14:54Z
---

# Frontmatter header

## Problem
A note's YAML frontmatter is shown as typed on a tinted panel (codemirror/frontmatter-block.ts). It's useful metadata but reads as code above the writing, and changing a `status` or a date means editing YAML by hand.

## Desired behavior
Rescoped 2026-10-25 after review of the chip-header build, which didn't fit HermesMarkdown and was reverted. The simple approach:
- Unfolded, the frontmatter stays raw YAML on its tinted panel, as before.
- Folded (chevron or Ctrl/Cmd+Shift+.), the block becomes one line: the `title`, then every tag as a pill (a tag cloud). "Frontmatter" only when it has neither. Click unfolds.

## Open questions for the architect
- Status values: WORKFLOW_TAGS today is draft/review/active/archived; the brief that started this used todo/in-progress/done. One list, or both? - use both
- Malformed YAML or nested values (lists of objects): fall back to showing the raw YAML? - show raw

## Out of scope
- A raw-mode toggle, Cmd/Ctrl+Shift+Y, a `---` icon, or a setting with three rendering modes (the caret reveal replaces them).
- Fading the chips while typing.
- Document types and the `/type` picker (plan 002).
