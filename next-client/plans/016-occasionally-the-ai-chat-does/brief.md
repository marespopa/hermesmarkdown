---
state: approved
size: small
kind: bug
blocked_from:
rejections: 0
created: 2026-10-22T10:35:54Z
---

# Occasionally the AI chat does not surface timeout or wrong-API-key error

## Problem
Occasionally the AI chat does not surface timeout or wrong-API-key errors: the chat stays stuck with no info, and the user isn't told to update their keys.

## Desired behavior
The bug is fixed. First write a test that reproduces it (it fails on the current code), then fix the code so it passes.

## Out of scope
Changes the fix doesn't need.
