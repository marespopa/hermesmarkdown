# FileIcon

Description: A file row's leading glyph (`FileRow`), neutral (`text-fg-faint`) like every sidebar icon. A note's document type, from `utils/note-type.ts` (`noteTypeOf`: the frontmatter's `type:`, else a `type/…` tag), picks its icon: `project` a briefcase, `task` a check circle, `meeting` people, `bookmark` a bookmark. A text file that isn't a note (`utils/file-kinds.ts`) shows a code glyph; anything else, or an unknown type, the document glyph.

## Local State & Storage
- State: none. Each row subscribes to its own note's type (`selectAtom` over `atom_fileMetadata`), so an index update re-renders only rows whose type changed.
- Persistence: none.

## Dependencies
- Core: `atom_fileMetadata`, `noteTypeOf`, `isPlainTextPath`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FileIcon path="projects/redesign.md" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| path | `string` | | The file's vault path |
