# TokenCostDialog

Description: What sending the note in the focused pane to an AI model costs. Shows the file name, its token count (o200k) and a `TokenCostTable` with one input-only Cost column per model; a reply's length can't be known here, so it isn't priced. Opened with the `hermes:open-token-cost` document event (`openTokenCostDialog` in `utils/open-helper-dialogs.ts`), sent by More → **Token Cost** and the palette's **Token cost of this note**. The count follows the note live while the dialog is open.

## Local State & Storage
- State: local `open`; reads `atom_content` and `atom_fileName` (the active tab). Persistence: none.

## Dependencies
- Core: `useTokenizer` (`countOnly`) and `TokenCostTable` from `app/tools`, `DialogModal`.
- The body (and so the tokenizer worker and its 2 MB vocabulary) mounts only while the dialog is open, never with the editor.
- Zero-Cloud: counting runs in a browser worker; the note is never sent anywhere.

## Quick Usage
```tsx
<TokenCostDialog />      // mounted once in app/editor/page.tsx
openTokenCostDialog();   // from a menu or command
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
