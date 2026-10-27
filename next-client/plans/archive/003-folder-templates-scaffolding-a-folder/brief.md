---
state: merged
size: normal
kind: feature
blocked_from: 
rejections: 0
created: 2026-10-27T10:29:31Z
---

# Folder templates & scaffolding. A folder inside _templates/ (distinct fr

## Desired behavior
Folder templates & scaffolding. A folder inside _templates/ (distinct from a pack, via a marker — prefer `scaffold: true` frontmatter in the folder's README.md; architect decides vs a name prefix) copies as a whole into the vault, creating a note structure on disk. {{prompt:Label}} and date tokens resolve in file and folder names as well as bodies; each prompt is asked once. Entry points: a palette command "New from folder template" and a folder's context menu in Files. Never overwrites: if any target already exists, stop before writing anything and say so. Optimistic UI: the tree updates at once, writes happen in the background, and everything rolls back on failure. Out of scope: daily logs or any dated-note generator (daily sheets were removed on 2026-10-13 and must not come back).

## Out of scope
Anything the request doesn't ask for.
