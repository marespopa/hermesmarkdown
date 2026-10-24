# TagHeading

Description: The Tags page's heading for the chosen tag (`#release`), wrapping on narrow widths. Beside it on desktop, a filled secondary **Pin** button (`TbPinned`) adds the tag to the vault's pins (`usePins().pin("tag", tag)`, written to `.hermes/pins.yaml`), listed in the sidebar's Pinned section. Once the tag is pinned the button reads **Pinned** (`TbPinnedFilled`) and is disabled: unpinning happens from the pinned row's own menu. Disabled with no vault. Hidden on mobile chrome (`useIsMobileChrome`), which has no sidebar.

## Local State & Storage
- State: None (pins come from `atom_pins` through `usePins`).
- Persistence: the pin lives in the vault file.

## Dependencies
- Core: `Button`, `usePins`, `useIsMobileChrome`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TagHeading tag={selected} hasVault={!!vaultHandle} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| tag | `string` | | The chosen tag, normalised (no `#`) |
| hasVault | `boolean` | | A vault is open (else the button is disabled) |
