# FrontmatterHeaderMenus

Description: The status menu and date picker behind the frontmatter header's chips. It renders nothing until a chip (or Ctrl/Cmd+Shift+Enter on a `status:` line) asks, then shows `FrontmatterStatusMenu` or `DatePickerCallout` and writes the choice into the YAML value only, as one undo step. Closing either returns focus to the editor; a caret that was inside the block moves to the body start first, so the header stays in view showing the new value.

## Local State & Storage
- State: `use-frontmatter-header` (`hooks/`) keeps the open status menu (`key`, current value, position) and date picker (`key`, `value`, `date`, `keptTime`). It listens for `FRONTMATTER_CHIP_EVENT` on the editor container, as `use-codemirror-callout-type` does for callouts.
- Persistence: None - transient UI state. A datetime keeps its time part (`2026-10-24T15:14:54Z` → `2026-11-02T15:14:54Z`); a date writes `YYYY-MM-DD` from the local day.

## Dependencies
- Core: `FrontmatterStatusMenu`, `DatePickerCallout`, `codemirror/frontmatter-header.ts` (`setFrontmatterValue`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FrontmatterHeaderMenus viewRef={viewRef} containerRef={containerRef} />
```

## Props Overview
| Prop | Type | Description |
|---|---|---|
| viewRef | `RefObject<EditorView \| null>` | The live editor view |
| containerRef | `RefObject<HTMLDivElement \| null>` | The element the chip event bubbles to |
