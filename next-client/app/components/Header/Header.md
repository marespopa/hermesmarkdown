# Header

Description: Marketing-page header. It wraps `Navbar` (logo plus desktop `NavigationLinks`/`MobileNavigationLinks` with a theme toggle) and is hidden on `/editor`.

## Local State & Storage
- State: `Navbar` keeps menu-open useState plus `useIsMobile`/`useResolvedTheme`. The navigation links read and write `atom_theme`.
- Persistence: `atom_theme` → `localStorage["theme"]`.

## Dependencies
- Core: `next/link`, `next/image`, `Button`, `Portal`, `react-icons`, `app/utils/theme`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Header from "./Header";

<Header />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | `Header`/`Navbar` take no props |
| handleClose | `() => void` |  | `MobileNavigationLinks` close handler |
| label, href, action? | `string, string, () => void` |  | `NavigationLink` props |
