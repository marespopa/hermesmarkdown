# SheetSkeleton

Description: The outline of a worklog sheet that `MarkdownEditor` lays over its text column while the [SheetSwitcher](SheetSwitcher.md) opens another sheet. An existing sheet opens at once (a rollup refreshes after it shows), but a week, month, quarter or year that doesn't exist yet is built from every daily sheet in its period first, which can take a moment. The skeleton is a title bar, a summary line and three headed sections of task lines (box and text), sized as a share of the column. It appears only after `SHEET_SKELETON_DELAY_MS` (150 ms), so a quick switch doesn't flash. At the same moment the editor hides the old text (`opacity-0` with a 150 ms delay on `#md-editor`), and the new sheet replaces the skeleton in place. The shapes pulse only when motion is allowed (`motion-safe:animate-pulse`). It is a `role="status"` region named "Opening sheet", with screen-reader text; the shapes are `aria-hidden`.

## Local State & Storage
- State: `visible`, which turns on after the delay.
- Persistence: None.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<div className="editor-measure relative h-full">
  {isSheetOpening && <SheetSkeleton />}
  …
</div>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| delay? | `number` | `SHEET_SKELETON_DELAY_MS` | How long to wait before showing, in ms; `0` shows at once |
