---
state: approved
size: small
kind: bug
blocked_from:
rejections: 0
created: 2026-10-22T17:52:12Z
---

# AI Chat sends the active note to the AI even when it is private: buildCh

## Problem
AI Chat sends the active note to the AI even when it is private: buildChatSystemPrompt (app/editor/components/ai-chat/chat-helpers.ts) always adds the active file's content, and page.tsx passes atom_content with no privacy check, while PrivateNoteGate only veils the editor. A private note (private: true or a private tag, see app/utils/note-privacy.ts) must not be sent while it is still veiled; the docs promise private notes are never sent. Once the user has revealed it in the editor, sending it is fine. The chat header's 'The AI sees …' chip must match what is actually sent.

## Desired behavior
The bug is fixed. First write a test that reproduces it (it fails on the current code), then fix the code so it passes.

## Out of scope
Changes the fix doesn't need.
