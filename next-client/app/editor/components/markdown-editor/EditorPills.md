# EditorPills

Description: Renders the floating helpers drawn over the editor near the caret — date pill and calendar, link pill (open / edit), workflow and task-status pills, Mermaid and image viewer buttons, and the code-block language picker. It only renders; matching and positioning come from the CodeMirror feature hooks.

## Local State & Storage
- State: None; everything comes from the hook results passed in.
- Persistence: None.

## Dependencies
- Core: `Button`, `Typeahead`, `DatePickerCallout`, `LinkPill`, `WorkflowPill`, `@codemirror/language-data`, `utils/open-helper-dialogs.ts`.
- Zero-Cloud: Opening a link pill calls `window.open` after a user click; no other side effects.

## Quick Usage
```tsx
<EditorPills features={features} languagePicker={languagePicker} mermaid={mermaid} image={image}
  containerRef={containerRef} onWikiLinkClick={openWikiLink} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| features | `ReturnType<typeof useCodeMirrorFeatures>` | | Link, date, workflow, and task pill state |
| languagePicker | `ReturnType<typeof useCodeMirrorCodeLanguagePicker>` | | Language picker state |
| mermaid / image | hook results | | Viewer button state |
| containerRef | `RefObject<HTMLDivElement>` | | Editor container (for clamping) |
| onWikiLinkClick? | `(name: string) => void` | | Opens a `[[wikilink]]` |
