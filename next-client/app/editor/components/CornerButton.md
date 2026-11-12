# CornerButton

Description: One button of the window's top-right row: on the editor (`EditorShell`'s corner row) and in the pages' title bars (`ShellPage`). A 32px rounded square with a faint tint (`PILL_BUTTON_CLASS`), an icon, and a tooltip below it. Every button in those rows is this component (`PageOnlyToggleButton`, `CopyContentButton`, `SettingsButton`, `SearchPill`, `PageHelpLink`, `DocumentationLink`), so their shape, tint, rounding and focus ring can't drift apart. With `href` it renders a link (`TextLink`) that looks the same; the link's own rounding and focus ring are overridden by the pill's.

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `Button` (`unstyled`), `TextLink` (`unstyled`), `Tooltip`, `PILL_BUTTON_CLASS`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<CornerButton icon={<HiOutlineCog size={14} aria-hidden="true" />} label="Settings" onClick={openSettings} />
<CornerButton icon={<HiOutlineBookOpen size={14} aria-hidden="true" />} label="Documentation" href="/documentation" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| icon | `ReactNode` | | The glyph (14px, 16px for search) |
| label | `string` | | Accessible name; also the tooltip unless `tooltip` is set |
| tooltip? | `string` | `label` | Tooltip text when it differs from the name |
| shortcut? | `string` | | Shown in the tooltip |
| href? | `string` | | Renders a link instead of a button |
| className? | `string` | `""` | Extra classes (a pressed state, placement) |
| …rest | `Button` props | | `onClick`, `isDisabled`, `aria-pressed`, … (button only) |
