# DraftFolderDialog

Description: "Save note to…" picker shown on an untitled draft's first save in a vault. Lists the vault root and every non-hidden folder, with the "New note folder" setting preselected. Typing filters the list, and a path that doesn't exist is offered as "Create folder …". Enter or Save picks the highlighted folder; Escape or Cancel leaves the draft unsaved.

## Local State & Storage
- State: Reads `atom_draftFolderRequest` (set by `useMaterializeDraft`, `hooks/use-materialize-draft.ts`); filter text and highlighted row are local.
- Persistence: None. Dismissing sets `atom_draftFolderDeclined`, so autosave and window blur stop asking about that draft; Cmd+S still asks. A new draft clears it.

## Dependencies
- Core: `DialogModal`, `Button`, `normalizeFolderPath`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<DraftFolderDialog />
```

## Props Overview
None; driven entirely by `atom_draftFolderRequest`.
