---
state: approved
size: small
kind: bug
blocked_from:
rejections: 0
created: 2026-10-25T19:11:25Z
---

# Copy-pasting a numbered list turns the number into '2/. Title' (an escap

## Problem
Copy-pasting a numbered list turns the number into '2/. Title' (an escaped marker, like 2\. Title), even when I copy just '2.'. Pasting a list should keep its numbers exactly as copied.

## Desired behavior
The bug is fixed. First write a test that reproduces it (it fails on the current code), then fix the code so it passes.

## Out of scope
Changes the fix doesn't need.
