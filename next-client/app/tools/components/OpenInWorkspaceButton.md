# OpenInWorkspaceButton

Description: "Open in HermesMarkdown" for a tool page. On click it writes the tool's Markdown to this tab's sessionStorage (`writeToolHandoff`, `app/utils/tool-handoff.ts`) and navigates, in the same tab, to `/editor?from=<source>` (`toolEditorUrl`); the editor's `useToolHandoff` puts it in the draft. Oversized work or blocked storage shows an error toast and stays on the page.

## Local State & Storage
- State: none.
- Persistence: `sessionStorage["hermes_tool_handoff"]`, read and cleared by the editor.

## Dependencies
- Core: `Button`, `showErrorToast` (`components/Toastr`), `useRouter`.
- Zero-Cloud: no network requests. The `from` query parameter is visible to the existing cookieless page-view counter only.

## Quick Usage
```tsx
<OpenInWorkspaceButton source="tokenizer" title="Tokenized text" getMarkdown={() => text} disabled={!text} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| source | `ToolHandoffSource` | | The tool, also used for `?from=` |
| title | `string` | | The draft's name (1–60 characters) |
| getMarkdown | `() => string` | | Read on click |
| disabled | `boolean` | `false` | |
| variant | `"primary" \| "outlined"` | `"primary"` | |
| className | `string` | `""` | |
