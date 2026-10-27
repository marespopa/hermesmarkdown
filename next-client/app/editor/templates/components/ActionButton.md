# ActionButton

Description: A Templates page action button: an icon and a label on a [Button](../../../components/Button/Button.md) (`small` unless `variant` says otherwise). With `pending`, it is disabled and `aria-busy`, and its icon gives way to a small spinner that appears only after ~150 ms (`.loading-bar-appear`), so a quick action shows nothing and a slow one shows it's under way. The page disables an item's other buttons while one of its actions runs (`isDisabled`), so nothing can run twice.

## Local State & Storage
- State: None (the page's `usePendingActions` owns what's pending).
- Persistence: None.

## Dependencies
- Core: `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import ActionButton from "@/app/editor/templates/components/ActionButton";

<ActionButton onClick={duplicate} pending={pending === "duplicate"} isDisabled={!!pending} icon={<HiOutlineDuplicate size={14} aria-hidden />} label="Duplicate" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| icon | `ReactNode` |  | Shown before the label; the spinner's place while pending |
| label | `ReactNode` |  | The button's text |
| pending | `boolean` | `false` | This button's action is under way: disabled, spinner after a moment |
| variant | `ButtonVariant` | `"small"` | Any `Button` variant |
| …rest | `Button` props |  | `onClick`, `isDisabled`, `aria-label`, `className`, … |
