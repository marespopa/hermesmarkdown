# TemplatePromptForm

Description: The "Fill in the template" modal shown before a template with `{{prompt:Label}}` tokens is written or inserted. One `Input` per distinct label, in first-appearance order; the first field is focused, Tab / Shift+Tab move between fields, Enter in any field submits, Esc or Cancel cancels the whole action. Empty answers are allowed and become `""`. Bottom sheet on mobile, so the keyboard doesn't cover it.

## Local State & Storage
- State: the typed value per label.
- Persistence: None - transient UI state.

## Dependencies
- Core: `DialogModal` (`onConfirm` for Enter, `mobileSheet`), `Input`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TemplatePromptForm isOpen labels={["Owner", "Due"]} confirmLabel="Create"
  onSubmit={(values) => …} onCancel={() => …} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` | | Visibility |
| labels | `string[]` | | Distinct prompt labels |
| confirmLabel | `string` | | Primary button ("Create" / "Insert") |
| onSubmit | `(values: Record<string, string>) => void` | | Every label → its answer |
| onCancel | `() => void` | | Esc / Cancel |
