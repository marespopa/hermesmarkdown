# HermesMarkdown System Architecture

This document describes the runtime data flow of the editor.

## System Architecture & Data Flow

```text
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│      LOCAL FILE SYSTEM       │        │   BROWSER / GITHUB VAULT         │
│  Plain .md files on disk     │        │  Files in the browser's Origin   │
│  (File System Access API,    │        │  Private FS; GitHub vaults also  │
│   Chromium)                  │        │  sync with a repository          │
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

- **Local file system:** User-selected Markdown vault accessed through the File System Access API (Chromium). Handles are persisted in IndexedDB (`app/services/idb.ts`).
- **Browser vaults:** Vaults kept in the Origin Private File System (`app/services/opfs.ts`, `app/hooks/file-system/use-browser-vault.ts`) for browsers without disk folder access (Safari, iOS, Firefox). They use the same handle-based file layer. Writes go through `app/services/file-writer.ts`, which falls back to `app/workers/opfs-writer.worker.ts` where `createWritable()` is missing. Whole-vault zip export / import lives in `app/services/vault-archive.ts`.
- **Offline app:** `public/sw.js` (registered by `app/components/ServiceWorkerRegister.tsx` in production) serves navigations network-first with a cached shell, and hashed `/_next/static` assets cache-first. It never touches `/api/*`.
- **GitHub vaults:** Optional. Repository files are imported into the Origin Private File System (`app/services/github-vault-workspace.ts`); commits and pulls go through `app/api/github/` (`app/services/github-vault-sync.ts`, `github-api.ts`, `github-auth.ts`).
- **File-system hooks:** `app/hooks/file-system/` implements open, save (with retries), create, rename, move, duplicate, and delete, plus the vault manager.
- **File watcher:** `app/hooks/use-file-watcher.ts` reloads open files on `FileSystemObserver` change records (Chromium), with backoff polling and an immediate check on window focus as the fallback, feeding `ConflictDialog`.
- **Metadata worker:** `app/workers/metadata.worker.ts` extracts frontmatter, tags, wikilinks and word counts off the main thread; tasks are parsed by `app/utils/taskExtractor.ts`.
- **Jotai atoms:** See `app/atoms/README.md`. Privacy (`privacy-atoms.ts`): notes marked sensitive in frontmatter go through the display factory (`app/utils/note-display.ts`, `atom_noteDisplayItems`), which feeds every note listing (home feed, command palette, Tasks page) according to the persisted Privacy Mode; the editor veils sensitive notes (`SensitiveNoteGate`) until revealed for the session. Screen privacy only, not encryption.
- **CodeMirror 6 editor:** `app/editor/codemirror/` owns editing, keyboard commands, syntax highlighting, the table grid (`table-display.tsx`) and formulas (`table-formulas.ts`, `utils/formula-engine.ts`), and the inline Mermaid / KaTeX previews (`rendered-block.ts`, edited through `RenderedBlockSourceDialog`), and inline calculator labels (`note-calc.ts`, `utils/note-calc-scan.ts`). Preview mode (`preview-mode.ts`) reuses the same view: a compartment makes it read-only and hides Markdown syntax, with one app-wide mode in `atom_viewMode`.
- **AI route:** `app/api/ai/route.ts` relays requests to Anthropic or Gemini; client helpers live in `app/services/ai.ts`.

The metadata index is an implementation cache, not a second source of truth. It must be safe to discard and rebuild from the Markdown vault.
