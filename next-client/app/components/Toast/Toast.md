# Toast

Description: Persistent call-to-action card with icon, title, action button, and an optional inline name field. When the card appears, the action button takes focus, so Enter takes the action; with a name field, the field takes focus instead and Enter in it takes the action.

## Local State & Storage
- State: Dismissed and closing flags (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `Input`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Toast from "@/app/components/Toast";

<Toast isVisible icon={<FiFileText />} title="Welcome back" description="Resume your file" actionLabel="Open" onAction={open} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isVisible | `boolean` |  | Visibility |
| icon | `ReactNode` |  | Leading icon |
| title / description | `string` |  | Text |
| actionLabel | `string` |  | Button label |
| onAction | `() => void` |  | Button handler |
| nameValue? / onNameChange? / namePlaceholder? | `string` / handler |  | Optional name input |
