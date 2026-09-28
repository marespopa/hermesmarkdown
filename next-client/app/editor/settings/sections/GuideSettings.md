# GuideSettings

Description: The Settings → Guide section. **Onboarding** restarts the Welcome tour (opens the wizard and returns to `/editor`). **Help** opens the global keyboard shortcuts overlay or the `/documentation` page. **About** shows the app version (from `package.json`) and links to the What is HermesMarkdown, Contact, Privacy, and Terms pages.

## Local State & Storage
- State: writes `atom_isWizardOpen` and `atom_keyboardShortcutsOpen` (both ephemeral).
- Persistence: None.

## Dependencies
- Core: `SettingControls`, `Button`, `next/link`, `next/navigation` (`useRouter`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<GuideSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Self-contained |
