## Git change gutter
- New **Git Changes** toggle (palette and Settings → Editor → View, off by default): in a disk vault with `.git` at its root, thin gutter bars mark lines added (moss), changed (link blue) or deleted (red wedge) compared with HEAD. Bars update 150 ms after typing and when HEAD moves (focus, visibility, 5 s poll while focused).
- Read-only: `app/services/git/` reads HEAD, loose objects, packs (idx v2, OFS/REF deltas, windowed inflate) and trees from the vault's `.git` handle in a new `git-read` worker; nothing is written or run.
- Diff uses `Chunk.build` from the new `@codemirror/merge` dependency (pinned 6.12.3); the gutter is its own compartment in both extension builders.
- The palette command explains "No .git folder at the vault's root" when the vault isn't a repo. Docs and landing copy updated.
