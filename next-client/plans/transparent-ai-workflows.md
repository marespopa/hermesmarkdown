# Transparent AI Workflows Plan

## Problem

HermesMarkdown already provides a right-edge AI Companion that can read and mutate vault content through browser-side tools, plus a CodeMirror editor and a command palette. Its current AI workflow is chat/tool-call based rather than a review-first editing system: there is no shared proposed-change model, staged accept/reject flow, explicit context composer, or AI checkpoint history.

The requested feature set spans several substantial product surfaces: staged document edits and split review; explicit context and persona controls; interactive AI plans and checkpoints; and specialized code, documentation, and note assistance. A first release needs a bounded vertical slice so its data model and interaction contract can support later capabilities without committing to automatic writes.

## Confirmed First-Release Scope

Build a review-first AI change workflow as the foundational vertical slice. It covers AI edits from both the Companion and selected-text command-palette transformations. It does not include the context composer, persona profiles, durable history, Git branches, execution sandboxes, or domain-specific assistance in this release.

1. Define a typed, session-scoped AI proposal model containing the target note/path, base text/version, proposed text, prompt, and per-hunk resolution state.
2. Update the Companion tool contract so edit-producing responses create proposals only; they do not write files until the user accepts selected changes.
3. Add a CodeMirror proposal-diff extension that decorates additions/deletions as inline ghost diffs and exposes accessible per-hunk accept/reject controls with documented keyboard bindings.
4. Add a review surface for full-proposal comparison, starting with a text side-by-side diff; keep AST-aware and structural/document outline deltas as a later extension.
5. Hold all accepted hunks as a staged proposal and provide one explicit “Apply staged changes” action. On application, write through the existing note buffer/file-system path and detect stale-base conflicts before overwriting.
6. Surface focused transformations through the existing command palette for selected text, using the same proposal pipeline.
7. Keep proposal and checkpoint state only in the active Companion session. Users can discard unaccepted proposals, but this is not represented as a real Git branch or durable version tree.

## Deferred Follow-ons

- Explicit `@file` / `@section` context composer and budget gauge.
- Interactive multi-step AI plan cards.
- Execution-sandbox previews and live type/syntax validation for code changes.
- Markdown AST/outline delta visualization and voice/tone controls.
- WikiLink and tag proposal previews.
- Durable cross-session proposal history and true local Git branches/version trees.
- Full persona/system-prompt profile management.

## Validation

- Unit tests for proposal lifecycle, hunk acceptance/rejection, stale-base conflict handling, and staged-application behavior.
- Component tests for Companion proposal cards, keyboard accessibility, and command-palette entry points.
- CodeMirror extension tests for decorations and document updates.
- Run the repository’s CI checks after implementation rather than the full suite locally.
