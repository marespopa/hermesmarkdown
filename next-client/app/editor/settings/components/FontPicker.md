# FontPicker

Description: Masonry grid of font cards, each previewing sample text in its own typeface.

## Local State & Storage
- State: None (controlled).
- Persistence: None itself. Callers store the choice (for example `localStorage["editorFontFamily"]`).

## Dependencies
- Core: React only. Font options come from `settings/font-options`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import FontPicker from "@/app/editor/settings/components/FontPicker";

<FontPicker fonts={FONTS} value={font} onChange={setFont} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| fonts | `FontOption[]` (`{ label, value }`) |  | Choices |
| value | `string` |  | Selected font |
| onChange | `(value: string) => void` |  | Selection handler |
| previewText? | `string` | `"The quick brown fox 0123"` | Sample text |
