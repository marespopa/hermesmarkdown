# TemplateSaveCard

Description: Card under an AI Chat reply for one `~~~~hermes-template <name>` block (template skill). Shows the target path (`<templates folder>/<name>.md`), any lint warnings from `lintTemplate` (they never block saving), and one button: **Save template**, or **Replace template** when that file already exists. Nothing is written until the button is clicked; afterwards it reads **Saved**. If the reply is edited in place and the block's content changes, the card goes back to Save / Replace so the edited template can be saved. Without an open vault the button is disabled ("Open a vault to save").

## Local State & Storage
- State: `idle` / `saving` / `saved`.
- Persistence: None - the save itself goes through `onSave` (`useChatSkills().saveTemplate`).

## Dependencies
- Core: `Button` (`secondary`), `lintTemplate`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects; writes only into the vault, on click.

## Quick Usage
```tsx
<TemplateSaveCard block={block} path="templates/rfc.md" exists={false} canSave onSave={saveTemplate} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| block | `TemplateBlock` | | `{ fileName, content }` parsed from the reply |
| path | `string` | | Shown target path |
| exists | `boolean` | | Label the button "Replace template" |
| canSave | `boolean` | | False without a vault |
| onSave | `(block) => Promise<boolean>` | | Writes the file; true on success |
