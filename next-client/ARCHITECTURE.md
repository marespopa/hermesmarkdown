# HermesMarkdown System Architecture

This document describes the runtime data flow for the Capture and Planning System.

## System Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          LOCAL FILE SYSTEM                              │
│                    (Plain text .md files on disk)                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ File Access Handle (FS API)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          WORKSPACE FILE WATCHER                         │
│                    (Detects mtime changes & saves)                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PARSER & AST GENERATOR                          │
│        (Tolerant AST generation, inline directive extraction)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         JOTAI WORKSPACE INDEX                           │
│     (Task Nodes, Date Map, Overdue Queue, Structural Tree Cache)        │
└─────────────────────┬──────────────────────────────┬────────────────────┘
                      │                              │
                      ▼                              ▼
┌───────────────────────────┐          ┌──────────────────────────────────┐
│    CODEMIRROR 6 EDITOR    │          │     PANELS & UI COMPONENTS       │
│  - Outline Nav & Zoom     │          │  - Today Sliding Panel           │
│  - Keyboard Shortcuts     │          │  - Inbox Fast Capture Drawer     │
│  - Inline Block Formatting│          │  - Global Search (Cmd+K)         │
└───────────────────────────┘          └──────────────────────────────────┘
```

## Architectural Principles

1. Markdown files remain the canonical source of truth.
2. Parsed outline data and workspace indices are rebuildable derived state.
3. CodeMirror structural mutations are dispatched as atomic transactions.
4. File-system changes are observed and re-indexed without replacing local files silently.
5. Jotai atoms expose indexed state to the editor and workspace panels.

## Runtime Components

- **Local file system:** User-selected Markdown vault accessed through the File System Access API.
- **Workspace file watcher:** Detects external changes and coordinates reload or conflict handling.
- **Parser and AST generator:** Extracts headings, list hierarchy, tasks, dates, and inline directives.
- **Jotai workspace index:** Provides derived task, date, overdue, and structural queries.
- **CodeMirror 6 editor:** Owns editing, keyboard commands, syntax highlighting, and transactional mutations.
- **Panels and UI components:** Consume the index for Today, Inbox, search, and other workspace views.

The index is an implementation cache, not a second source of truth. It must be safe to discard and rebuild from the Markdown vault.
