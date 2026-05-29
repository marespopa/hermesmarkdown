# Hermes Development Mandates

## Component Usage
- **Always use existing components**: When modifying or adding UI, always prioritize using established components from `app/components/` (e.g., `Button`, `Input`).
- **Do not bypass components**: Avoid using raw HTML tags (`<button>`, `<input>`, etc.) or custom-styled divs for UI elements that already have a dedicated project component.
- **Maintain Consistency**: Adhere to the established design system and component variants (e.g., `primary` for main actions, `secondary` for secondary/cancel actions).

## File System Integrity
- **Handle Closure**: Always ensure `FileSystemWritableFileStream` objects are closed in a `finally` block to prevent file locking issues.
- **Fresh Handles**: Obtain fresh `FileSystemHandle` objects before performing move or rename operations to avoid "state changed" errors.
