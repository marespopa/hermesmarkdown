## Note links: Linked from, Unlinked mentions, link rewrite on rename/move

- The library gets "Linked from" (notes linking to the open note; click opens the source at the link) and a collapsed "Unlinked mentions" (notes naming it in plain text).
- Renaming or moving a note or folder rewrites `[[wikilinks]]` that would break, in open and closed notes; undo restores them. A toast reports the count.
- Wiring: new `content:mentions` worker request with its own supersede slot (the palette search is never cancelled); rewrites go through `writeThrough` (disk wins) after the path remap and before the rescan.
- Link resolution moved to `utils/note-links/link-resolver.ts`; `resolveFileMetaByName` delegates to it.
