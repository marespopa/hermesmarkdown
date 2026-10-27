---
state: specced
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-27T12:00:00Z
---

# Frontmatter Details: an Apple-style card for note properties

## Desired behavior
Adding and editing frontmatter is hard today: `/frontmatter` drops a raw YAML block and the user types keys by hand. Show a note's frontmatter as a quiet **Details** card at the top of the note instead of YAML text, while the file stays the same plain YAML.

- Nothing appears until it's needed: a note without frontmatter shows no card.
- Adding is a one-tap choice from suggested chips (keys the vault already uses), not an empty "key name" field.
- The value decides the control (date picker, status menu, tag tokens, note link, toggle, text), with no schema or type setup.
- Friendly labels and dates on screen; edits change only the edited lines on disk.
- One click (or a setting) shows the raw YAML for power users.
- Keyboard first: a shortcut jumps into the card, Tab moves between values.

## Out of scope
A typed metadata index, a backlinks panel, a properties table view, schemas or required fields, note-level object types, UIDs, a graph view.
