# ServiceWorkerRegister

Description: Registers `public/sw.js` so the installed app (PWA) starts and runs offline. A newer version activates silently as soon as it installs: there is no prompt and no forced reload, and the next load runs the new version.

## Local State & Storage
- State: None. Registration happens once in an effect.
- Persistence: The service worker keeps the app shell and hashed `/_next/static` assets in Cache Storage (`hermes-<version>`). Old caches are removed when a new version activates. Notes are never cached here; vaults live on disk, in browser storage (OPFS), or in the GitHub workspace.

## Dependencies
- Core: None.
- Network: Registers `/sw.js?v=<NEXT_PUBLIC_APP_VERSION>`. The worker never intercepts `/api/*` or cross-origin requests.

## Behavior
- Runs only when `NODE_ENV === "production"` and the browser supports service workers.
- The version query string comes from `package.json` through `next.config.js`, so bumping the version installs a fresh worker and cache.
- Installs and updates are both silent. The worker calls `skipWaiting()` once it has cached the shell, so it never waits behind an older version.

## Quick Usage
```tsx
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";

<ServiceWorkerRegister /> // once, in the root layout
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
