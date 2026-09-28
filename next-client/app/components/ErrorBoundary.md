# ErrorBoundary

Description: Class error boundary that catches render errors and shows a retry/home fallback instead of a blank page.

## Local State & Storage
- State: `hasError`/`error` component state.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects. Errors are logged to the console only and never reported to a server.

## Quick Usage
```tsx
import ErrorBoundary from "@/app/components/ErrorBoundary";

<ErrorBoundary onGoHome={() => router.push("/")}>{children}</ErrorBoundary>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | Guarded tree |
| fallback? | `ReactNode` |  | Custom fallback UI |
| onGoHome | `() => void` |  | "Home" button action |
