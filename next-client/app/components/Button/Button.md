# Button

Description: Base `<button>` primitive with variant-driven styling, used for every clickable control in the app.

## Local State & Storage
- State: None (stateless).
- Persistence: None - transient UI state.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Button from "@/app/components/Button";

<Button variant="primary" label="Save" onClick={save} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "secondary" \| "outlined" \| "icon" \| "icon-bg" \| "tertiary" \| "hero" \| "warning" \| "bare" \| "fab-action" \| "fab-toggle" \| "pill-icon" \| "menu-item"` |  | Visual style |
| label? | `string \| ReactNode` |  | Content (alternative to `children`) |
| onClick? | `(e: MouseEvent) => void` |  | Click handler |
| isDisabled? | `boolean` | `false` | Disables the button |
| className? | `string` | `""` | Extra classes |
| ...rest | `any` |  | Forwarded to `<button>` |
