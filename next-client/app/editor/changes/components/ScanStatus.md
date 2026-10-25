# ScanStatus

Description: Tells you whether the Changes page's list is complete. While a scan runs it shows a spinner and how far it got (`scanStatus`: "Reading the repository…", "Listing files… N found", "Checking N of M files…"); once the scan is done, a check and **Up to date**. It sits after the commit in `ChangesSummary`, and after "No changes since the last commit." Over a finished result (a scan's or the saved one shown at once), a scan shorter than 150ms keeps showing **Up to date**, so a rescan on window focus doesn't flicker; with no result yet, the progress shows at once. `role="status"`, so screen readers hear the change.

## Local State & Storage
- State: `slow` (the scan has run for 150ms).
- Persistence: None.

## Dependencies
- Core: `formatCount`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ScanStatus scanning={scanning} progress={progress} hasResult={result?.status === "ok"} />
```

## Props Overview
| Prop | Type | Description |
|---|---|---|
| scanning | `boolean` | A scan is running |
| progress | `ChangesProgress \| null` | The running scan's phase and counts |
| hasResult | `boolean` | A finished result is on screen |
