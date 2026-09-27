# HermesMarkdown System Architecture

This document describes the runtime data flow of the editor.

## System Architecture & Data Flow

```text
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│      LOCAL FILE SYSTEM       │        │   GITHUB VAULT (optional)        │
│  Plain .md files on disk     │        │  Repo files mirrored into the    │
│  (File System Access API)    │        │  browser's Origin Private FS     │
└──────────────┬───────────────┘        └───────────────┬──────────────────┘
               │ directory handle                       │ /api/github/* (OAuth,
               │                                        │ import, commit, pull)
               ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  FILE-SYSTEM HOOKS  (app/hooks/file-system)             │
│   open / save / create / rename / move / delete, retries, vault manager │
└───────────────┬───────────────────────────────────────┬─────────────────┘
                │                                       │
                ▼                                       ▼
┌───────────────────────────────┐       ┌─────────────────────────────────┐
│  FILE WATCHER                 │       │  METADATA WORKER                │
│  hooks/use-file-watcher.ts    │       │  workers/metadata.worker.ts     │
│  polls with backoff + on      │       │  frontmatter, tags, wikilinks,  │
│  focus; conflict dialog       │       │  word count, tasks              │
└───────────────┬───────────────┘       └────────────────┬────────────────┘
                │                                        │
                ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          JOTAI ATOMS  (app/atoms)                        │
│   vault + open files, workspace panes/tabs, file metadata index,        │
│   tasks (task-atoms), UI and settings                                   │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌─────────────────────────────────┐   ┌───────────────────────────────────┐
│     CODEMIRROR 6 EDITOR         │   │     VIEWS & UI                     │
│  - Markdown highlighting, pills │   │  - Explorer (/editor/files)        │
│  - Tables grid + formula engine │   │  - Tasks page (/editor/tasks)      │
│  - Slash menu, shortcodes       │   │  - Command palette / quick switcher│
│  - Keyboard commands, Vim       │   │  - Settings, dialogs, AI chat      │
└─────────────────┬───────────────┘   └───────────────────────────────────┘
                  │ AI actions (only with a user key)
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│    /api/ai  →  Anthropic / Google Gemini   (key sent per request,       │
│                                              never stored server-side)  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Architectural Principles

1. Markdown files remain the canonical source of truth.
2. The metadata index and task lists are rebuildable derived state.
3. CodeMirror structural mutations (tables, list indent, task cycling) are dispatched as atomic transactions, so each is one undo step.
4. External file changes are detected and surfaced through the conflict dialog — local edits are never replaced silently.
5. Jotai atoms expose indexed state to the editor and views.
6. Network access is opt-in: only AI actions (with a user-supplied key) and GitHub vaults talk to the server routes.

## Runtime Components

- **Local file system:** User-selected Markdown vault accessed through the File System Access API. Handles are persisted in IndexedDB (`app/services/idb.ts`).
- **GitHub vaults:** Optional. Repository files are imported into the Origin Private File System (`app/services/github-vault-workspace.ts`); commits and pulls go through `app/api/github/` (`app/services/github-vault-sync.ts`, `github-api.ts`, `github-auth.ts`).
- **File-system hooks:** `app/hooks/file-system/` implements open, save (with retries), create, rename, move, duplicate, and delete, plus the vault manager.
- **File watcher:** `app/hooks/use-file-watcher.ts` polls open files with backoff and checks immediately on window focus, feeding `ConflictDialog`.
- **Metadata worker:** `app/workers/metadata.worker.ts` extracts frontmatter, tags, wikilinks and word counts off the main thread; tasks are parsed by `app/utils/taskExtractor.ts`.
- **Jotai atoms:** See `app/atoms/README.md`.
- **CodeMirror 6 editor:** `app/editor/codemirror/` owns editing, keyboard commands, syntax highlighting, the table grid (`table-display.tsx`) and formulas (`table-formulas.ts`, `utils/formula-engine.ts`).
- **AI route:** `app/api/ai/route.ts` relays requests to Anthropic or Gemini; client helpers live in `app/services/ai.ts`.

The metadata index is an implementation cache, not a second source of truth. It must be safe to discard and rebuild from the Markdown vault.
