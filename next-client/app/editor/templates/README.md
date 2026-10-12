# editor/templates

The Templates page (`/editor/templates`). See "Templates page" in [../README.md](../README.md).

| File | Purpose |
|---|---|
| `page.tsx` | The page: your templates by pack (Use, Edit, New, Duplicate, Delete), New template (a name, then `templates/<name>.md` with a minimal body) / New pack, and the built-in packs, the only built-in catalogue (Add to vault). Scans the vault once when opened directly with nothing indexed. |
| [PackSection](components/PackSection.md) | One of your packs and its templates. |
| [BuiltinPackCard](components/BuiltinPackCard.md) | One built-in pack with Add to vault. |
