---
state: approved
size: small
kind: bug
blocked_from:
rejections: 0
created: 2026-10-22T18:03:14Z
---

# On desktop, a note that starts with frontmatter shows its collapsed '›

## Problem
On desktop, a note that starts with frontmatter shows its collapsed '› Properties · <title> · #tags' row (frontmatter-fold.ts) at the very top of the pane, under the pane's floating title breadcrumb (PaneLeaf.tsx: folder / name … header at top-2), so the two overlap. Seen in a split: the right pane showing hermesmarkdown/board.md had the breadcrumb drawn over the Properties row, while the left pane (no frontmatter) started its text clear of the breadcrumb. The first line of every note, including the Properties row, must start below the pane title's top room (--pane-top-room / PANE_TOP_ROOM), in single and split panes, without moving the SearchPill or the title, and the scrolled-state band must still cover text that scrolls under the title.

## Desired behavior
The bug is fixed. First write a test that reproduces it (it fails on the current code), then fix the code so it passes.

## Out of scope
Changes the fix doesn't need.
