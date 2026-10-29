# Transparent AI Workflows Plan

## Problem

HermesMarkdown already provides a right-edge AI Companion that can read and mutate vault content through browser-side tools, plus a CodeMirror editor and a command palette. Its current AI workflow is chat/tool-call based rather than a review-first editing system: there is no shared proposed-change model, staged accept/reject flow, explicit context composer, or AI checkpoint history.

The requested feature set spans several substantial product surfaces: staged document edits and split review; explicit context and persona controls; interactive AI plans and checkpoints; and specialized code, documentation, and note assistance. A first release needs a bounded vertical slice so its data model and interaction contract can support later capabilities without committing to automatic writes.

## Confirmed First-Release Scope

Build a review-first AI change workflow as the foundational vertical slice. It covers AI edits from both the Companion and selected-text command-palette transformations. It does not include the context composer, persona profiles, durable history, Git branches, execution sandboxes, or domain-specific assistance in this release. As of 2026-10-29 the Companion has no git tools, project checks, whole-file writes or plan tools: it reads notes and proposes edits only.

- [x] Define a typed, session-scoped AI proposal model containing the target note/path, base text/version, proposed text, prompt, and per-hunk resolution state.
- [x] Update the Companion tool contract so edit-producing responses create proposals only; they do not write files until the user accepts selected changes.
- [/] Add a CodeMirror proposal-diff extension that decorates additions/deletions as inline ghost diffs and exposes accessible per-hunk accept/reject controls with documented keyboard bindings.
- [ ] Add a review surface for full-proposal comparison, starting with a text side-by-side diff; keep AST-aware and structural/document outline deltas as a later extension.
- [ ] Hold all accepted hunks as a staged proposal and provide one explicit “Apply staged changes” action. On application, write through the existing note buffer/file-system path and detect stale-base conflicts before overwriting.
- [ ] Surface focused transformations through the existing command palette for selected text, using the same proposal pipeline.
- [ ] Keep proposal and checkpoint state only in the active Companion session. Users can discard unaccepted proposals, but this is not represented as a real Git branch or durable version tree.

## Scope Boundary

HermesMarkdown is a fast, local-first editor for thinking, drafting, and organizing structured notes. It is not an IDE, a Git manager, or a background AI daemon. AI features belong here only when they keep text editing fast, predictable, and under the author's control.

In scope: inline ghost diffs with per-hunk accept/reject, command-palette transformations on selected text (rephrase, summarize, table), and a simple step-by-step review card explaining why a section changed.

Out of scope: parsing external IDE/agent logs (SQLite, Cursor, Copilot), multi-file AST refactoring, Git branching engines, virtual file systems, and execution sandboxes. Notes stay in local folders or browser storage.

## Deferred Follow-ons

- Explicit `@file` / `@section` context composer and budget gauge.
- Session walkthrough cards: step-by-step review of why each section changed.
- Markdown outline delta visualization and voice/tone controls.
- WikiLink and tag proposal previews.
- Full persona/system-prompt profile management.

## Validation

- Unit tests for proposal lifecycle, hunk acceptance/rejection, stale-base conflict handling, and staged-application behavior.
- Component tests for Companion proposal cards, keyboard accessibility, and command-palette entry points.
- CodeMirror extension tests for decorations and document updates.
- Run the repository’s CI checks after implementation rather than the full suite locally.
