# Services

Framework-agnostic utilities: storage, export, conversion, prompt analysis.

## Storage

Composable persistence. `atomStorage` is the entry point — it picks a backend, migration runs once, callers write.

- `storage/atomStorage.ts` — backend factory; delegates to `fsStorage` if OPFS is available, else `localStorage`. Backend selectable via `NEXT_PUBLIC_STORAGE_BACKEND`.
- `storage/fsStorage.ts` — OPFS-backed JSON persistence behind an `AsyncStorage<T>` adapter; degrades gracefully when OPFS is unavailable.
- `storage/migrateLocalToFs.ts` — one-shot localStorage → OPFS migration for `["theme", "files", "selectedFileId"]`. Gated by the `__hermes_fs_migrated_v1__` flag so it runs exactly once.
- `idb.ts` — IndexedDB wrapper for the vault `FileSystemDirectoryHandle` (store / retrieve / verify-permission). Separate from atom persistence. No-op if IndexedDB is missing.

## Export & Conversion

- `export-service.ts` — top-level export dispatcher; formats YAML frontmatter, delegates markdown to `save-utils` and PDF to `converter`.
- `converter.ts` — canvas → PDF page splitter via jsPDF; handles margins, orientation, and multi-page aspect-ratio scaling.
- `save-utils.ts` — `showSaveFilePicker` first, blob download fallback; swallows `AbortError`; integrates toast feedback.

## Prompt Tools

- `prompt-clarity.ts` — scores prompt structure (XML tags, role / task / format), detects placeholders, flags fluff; emits a label (`Ready` / `Polishing` / `Template` / `Drafting`) plus a BPE-lite token estimate.
- `prompt-utils.ts` — strips YAML frontmatter, counts words / chars, estimates tokens (`words × 1.35`), Flesch ease via syllable approximation, clipboard helpers.

## Misc

- `date-utils.ts` — `YYYY-MM-DD` formatting, week-range generation, ms → `HH:MM:SS`.
- `headings.ts` — unist plugin: builds a hierarchical TOC from H2+ and generates deduplicated slug IDs.
- `useTimer.ts` — Pomodoro hook; tracks elapsed time, supports pause / resume, fires a browser Notification on completion (dialog fallback).
- `types.ts` — shared enums for export: `ConversionOptions`, `Margin`, `Resolution`.
