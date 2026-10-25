---
state: approved
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-24T00:00:00Z
---

# Git change gutter

## Problem
A disk vault is often a git repository, but the editor can't show what changed in a file since the last commit. You have to switch to a terminal or a git app to see it.

## Desired behavior
- A toggle, Git Changes (palette and Settings → Editor → View), off by default.
- When it's on and the open file is in a disk vault that has a `.git` folder at its root, thin bars in the gutter mark lines added, changed or deleted compared with the file at the last commit (HEAD). They update as you type.
- Read-only: the app never runs or writes git. It only reads `.git`.
- Gutter bars only. Inline old-line peek, revert hunk and next/previous change are later work.
