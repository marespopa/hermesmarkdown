# SettingControls

Description: Settings layout primitives: `SettingGroup`, `SettingItem`, `SettingNote` (a static row of information with no control), `SegmentedControl`, and `SelectControl`.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { SettingGroup, SettingItem, SegmentedControl } from "@/app/editor/settings/components/SettingControls";

<SettingGroup title="Editor">
  <SettingItem label="Width" control={<SegmentedControl options={widths} value={w} onChange={setW} />} />
</SettingGroup>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| SettingGroup: title?, children | `string`, `ReactNode` |  | Settings card, titled unless it is a section's only group |
| SettingNote: children | `ReactNode` |  | Static text row, for information with nothing to change |
| SettingItem: label, description?, control, layout? | `string`, `string`, `ReactNode`, `"row" \| "stack"` | `layout="row"` | One setting row |
| SegmentedControl: options, value, onChange | `{ label, value: T, Icon? }[]`, `T`, `(v: T) => void` |  | Button group |
| SelectControl: value, onChange, children, disabled?, size?, fullWidth?, ariaLabel? | `string \| number`, `(v: string) => void`, … | `size="md"`, `fullWidth=true` | Native select |
