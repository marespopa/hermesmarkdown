# SensitiveNoteGate

Description: Wraps a pane's `MarkdownEditor`. For a sensitive note it renders `SensitiveNoteVeil` instead of mounting the editor, until the note is revealed. Not mounting the editor keeps the note's text out of the DOM (browser find, screen readers, the palette's `@` heading scope).

## Local State & Storage
- State: `atom_fileMetadata`, `atom_revealAllSensitive`, `atom_revealedSensitivePaths`, `atom_revealSensitivePath` (`app/atoms/privacy-atoms.ts`). A `shownRef` latch per instance.
- Persistence: None. Reveals are session-only and reset on reload. `atom_remapVaultPaths` keeps revealed paths across rename / move.

## Logic
- `sensitive = isSensitiveContent(content) || isSensitiveFrontmatter(meta[filePath]?.frontmatter)`. The content check catches notes opened before the indexer reached them.
- `veiled = sensitive && !revealAll && !revealed.has(filePath) && !shownRef.current`.
- Once it renders the editor with non-empty content, `shownRef` latches: typing `sensitive: true` into an open note, or saving a draft as a file, never hides it mid-edit. An empty first render doesn't latch, so a sensitive note whose content loads after mount is still veiled.
- PaneLeaf passes the editor's key as the gate's `key`, so the latch lives exactly as long as the editor instance.
- If the content turns sensitive while the latch is set, the gate adds the path to `atom_revealedSensitivePaths` (except for `draft`), so the note stays revealed for the session across tab switches and renames instead of veiling on the next remount.
- **Show note** adds the path to the reveal set; **Show all sensitive notes this session** sets `atom_revealAllSensitive`. The veil applies at every Privacy Mode level; the level only governs listings.
- Title on the veil: `noteDisplayTitle(meta, true)` (frontmatter title / H1, else file name, else "Untitled sensitive note"); before indexing, the tab content's frontmatter and the path's file name are used.

## Dependencies
- Core: `SensitiveNoteVeil`, `app/utils/note-privacy.ts`, `app/utils/note-display.ts`, `frontmatter-utils`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SensitiveNoteGate key={editorKey} filePath={filePath} content={content} isActivePane={isActive}>
  <MarkdownEditor value={content} onChange={setContent} filePath={filePath} />
</SensitiveNoteGate>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| filePath | `string` |  | Vault path of the tab (`"draft"` for the draft) |
| content | `string` |  | The tab's current text |
| isActivePane | `boolean` |  | Focuses "Show note" in the active pane |
| children | `React.ReactNode` |  | The editor, mounted once revealed |
