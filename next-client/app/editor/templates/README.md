# editor/templates

The Templates page (`/editor/templates`). See "Templates page" in [../README.md](../README.md).

| File | Purpose |
|---|---|
| `page.tsx` | The page (folders in `_templates/` whose README.md has `scaffold: true` are folder templates, not packs, and aren't listed): your templates by pack (Edit, New, Duplicate, Delete), New template (the template wizard: a note or a folder template, blank, from a built-in example or, for a folder, from a vault folder; a pack's own New template still asks only the name) / New pack, the built-in packs, the only built-in catalogue of packs (Add to vault), and a Folder templates section after them (the Project folder, same card, **Copy to vault**: it is usable without copying, from New from folder template). Scans the vault once when opened directly with nothing indexed. |
| [PackSection](components/PackSection.md) | One of your packs and its templates. |
| [BuiltinPackCard](components/BuiltinPackCard.md) | One built-in pack with Add to vault. |
