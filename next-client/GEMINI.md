# HermesMarkdown Development Mandates

> [!IMPORTANT]
> All AI agents must strictly follow the rules defined in [AGENT_RULES.md](./AGENT_RULES.md) in addition to the mandates listed below.

## Component Usage
- **Always use existing components**: When modifying or adding UI, always prioritize using established components from `app/components/` (e.g., `Button`, `Input`).
- **Do not bypass components**: Avoid using raw HTML tags (`<button>`, `<input>`, etc.) or custom-styled divs for UI elements that already have a dedicated project component.
- **Maintain Consistency**: Adhere to the established design system and component variants (e.g., `primary` for main actions, `secondary` for secondary/cancel actions).

## File System Integrity
- **Handle Closure**: Always ensure `FileSystemWritableFileStream` objects are closed in a `finally` block to prevent file locking issues.
- **Fresh Handles**: Obtain fresh `FileSystemHandle` objects before performing move or rename operations to avoid "state changed" errors.

## Testing Standards (Vitest & Next.js)
- **Zero External API Calls**: All external APIs, hooks (like `useFileSystem`), and network requests must be mocked. Tests must remain fully isolated and run entirely client-side.
- **Behavior-Driven Testing**: Focus on user interactions and state changes (e.g., "clicking a button updates the content") rather than visual styles (CSS classes, colors, padding).
- **Mandatory Verification**: Every code change must be accompanied by a passing test run. Never push changes that break the CI/test suite.
- **Jotai State Isolation**: When testing components that use Jotai atoms, always wrap the component in a `Provider` to ensure a fresh state for every test case.
- **Router Mocking**: For components using `next/navigation`, provide a consistent mock for `useRouter` to prevent "app router not mounted" errors.

## Documentation & Maintainability
- **Component Documentation**: Always add a `README.md` for major components (e.g., those in `app/components/` or complex modules in `app/editor/components/`). Document purpose, key props, and architectural decisions.
- **File Size Standard**: Aim to keep files under 400 lines. If a file exceeds this, prioritize splitting it into subcomponents, hooks, or utility files to maintain maintainability and ease of understanding for both developers and AI agents.
