---
title: "Product Requirement Document (PRD): Glance for Hermes Markdown"
tags: [product, feature, markdown]
status: "draft"
---
# Product Requirement Document (PRD): "Glance" for Hermes Markdown

## 1. Executive Summary
Hermes Markdown lets developers and writers edit code and Markdown vaults directly on the local disk. In code‑heavy vaults (e.g., a Next.js / React project), a component’s source file is usually accompanied by a sibling Markdown file containing documentation or design notes (e.g., `Button.tsx` + `Button.md`).

The *Glance* feature gives instant, non‑disruptive read‑only previews of that documentation (or of wikilinks) directly from the code editor view, without closing the current tab or creating a persistent split pane.

## 2. Problem Statement & User Value
- **Problem**: Switching between a `.tsx` file and its paired `.md` requires either opening a separate tab, navigating the file tree, or configuring a split pane that consumes screen real‑estate.
- **Goal**: Reduce context‑switching latency to < 100 ms by introducing a lightweight, ephemerally‑visible overlay / popover.
- **Target Users**: Frontend architects, component library maintainers, and engineers using Hermes Markdown as a local‑first vault editor.

## 3. Key User Flows & Trigger Mechanisms
### A. Co‑Located File Preview (Auto‑Glance)
When a code file (e.g., `Component.tsx`) is opened, the UI shows a subtle "Glance Doc" badge in the tab header if a sibling documentation file exists (`Component.md`, `README.md`, or `Component.stories.md`).
- **Trigger**: click the badge or press the shortcut **Cmd + hover** / **Alt + G**.
- **Behavior**: a floating or side‑drawer preview card appears with the rendered Markdown.

### B. In‑Code Wikilink & @see Hover Preview
- **Trigger**: hover over a [[Component.md]] wikilink or an `@see {@link ./Component.md}` JSDoc comment while holding Cmd / Ctrl.
- **Behavior**: a rich Markdown popover is rendered at the cursor location.

## 4. Feature Specifications
### 4.1 Ephemeral Glance Popover (UI / UX)
- **Visual Style**: Glassmorphism overlay that adapts to Hermes Markdown’s light / dark themes.
- **Render Engine**: Lightweight AST parser for headings, lists, code blocks, and embedded images (`![[image.png]]`).
- **Interactivity**:
  - Read‑Only by default.
  - Escape / click outside immediately dismisses the popover.
  - Double click or Enter pins the content into a full editor pane.

### 4.2 Keyboard & Mouse Gestures
| Action | Shortcut / Input | Behavior |
|---|---|---|
| Peek Co‑located Doc | Alt + G / Option + G | Toggles floating Glance card for the current file’s companion `.md`. |
| Link Hover Peek | Cmd + hover on [[...]] or file path | Shows rendered popover at cursor position. |
| Dismiss Glance | Esc / Scroll Away | Closes the preview popover instantly. |
| Pin to Split View | Cmd + P (or Pin Icon inside popover) | Converts Glance into an active editor split pane. |

## 5. Technical Architecture & Implementation Plan
### File Resolution Strategy
When a `.tsx` file is open (e.g., `/next-client/src/components/Button/Button.tsx`), the Glance subsystem resolves the companion `.md` as follows:
1. Direct match in the same folder (`Button.md`).
2. Index doc in the same folder (`README.md` or `index.md`).
3. JSDoc `@see` / `@doc` path directive inside the file header.

```
/next-client/src/components/Button/
├── Button.tsx          // current file
├── Button.md           // primary target matched
└── README.md
```

- **Discovery Latency**: < 10 ms (pre‑indexed file path matching on folder load).
- **Render Time**: < 50 ms DOM injection for rendered Markdown AST.
- **Zero Disk Lock**: Read‑only streams via the browser File System Access API.

## 6. Success Metrics & Future Enhancements
- **Primary Metric**: > 40 % reduction in tab switching when navigating paired code/doc structures.
- **Phase 2 (Future)**:
  1. Bi‑directional editing in the Glance popover.
  2. Component props autocomplete extracted automatically.

---
*This is a product‑requirement document living in `next-client/plans/glance-docs.md`.*