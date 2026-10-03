# SidebarJournal

Description: The journal block at the top of the sidebar and the mobile Journal tab: a **Today** item (shortcut hint Ctrl/Cmd+Shift+D; `aria-current` while today's entry is the note on screen) and a `JournalCalendar`. Both set `atom_journalEntryRequest({ date })`; the editor page's `useTodayNote` opens that day's note, or creates the entry from the vault's journal template.

## Local State & Storage
- State: none of its own; reads `atom_homeFeedOpen` and the journal days from `useJournalEntries`.
- Persistence: None.

## Dependencies
- Core: `JournalCalendar`, `useJournalEntries`, `Button`, `SidebarNoteList` (item classes).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarJournal currentPath={currentNotePath} />
<SidebarJournal currentPath={activeFilePath} onNavigate={onClose} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| currentPath | `string \| null` | | The note on screen (null while the home feed shows) |
| showCalendar? | `boolean` | `true` | Show the month grid |
| onNavigate? | `() => void` | | Called after a day was requested |
