# CustomProviders

Description: Root provider stack: a Jotai `Provider` bound to the default store, wrapped around `ThemeProvider`.

## Local State & Storage
- State: Jotai default store (`getDefaultStore()`), shared by all atoms.
- Persistence: None itself; persisted atoms handle their own `localStorage` keys.

## Dependencies
- Core: `jotai`, `ThemeProvider`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import CustomProviders from "./CustomProviders";

<CustomProviders>{children}</CustomProviders>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | App tree |
