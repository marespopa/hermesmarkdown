# ActiveFileIndexer

Description: Runs `useIndexActiveFile` once for every /editor route: a second after the active note's text last changed, it posts that text to the metadata worker, which updates the note's tags, tasks and links and its note-text search entry. Mounted by [EditorShell](EditorShell.md). It used to run inside `useFileSystem`, so every component calling that hook subscribed to the note's text (a re-render per keystroke) and posted the note to the worker again; now one subscriber does it. Renders nothing.

## Local State & Storage
- State: Reads `atom_content`, `atom_activeFilePath`, `atom_activeFileHandle`, `atom_vaultHandle`; writes `atom_indexerState`, `atom_fileMetadata` (via `useIndexActiveFile`).
- Persistence: None.

## Dependencies
- Core: `useIndexActiveFile`, `metadataWorker`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ActiveFileIndexer />
```

## Props Overview
None.
