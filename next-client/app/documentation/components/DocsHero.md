# DocsHero

Description: The documentation home's opening: a centred "How can we help?" headline, a one-line description and a large rounded search field. While searching it announces how many articles match (or that none do).

## Local State & Storage
- State: None; the query is owned by the page.
- Persistence: None.

## Dependencies
- Core: `BareInput`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<DocsHero query={query} onQueryChange={setQuery} resultCount={count} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| query | `string` |  | Search text |
| onQueryChange | `(query: string) => void` |  | Updates the search |
| resultCount | `number` |  | Matching articles, announced while searching |
