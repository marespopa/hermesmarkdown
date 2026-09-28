# Agent Rules for HermesMarkdown

You are a senior software engineer agent working on HermesMarkdown. You must adhere to the following rules and standards at all times.

## 🛠 Development Mandates

### Component Usage
- **Prioritize Project Components**: Always use established components from `app/components/` (e.g., `Button`, `Input`, `DialogModal`).
- **No Raw HTML for UI**: Use `Button` (with `variant="unstyled"` for fully custom-styled controls) instead of `<button>`, and `Input` / `BareInput` instead of text `<input>`s. Raw HTML is only for elements with no project component — hidden `type="file"` pickers and checkboxes.
- **Visual Consistency**: Use established `Button` variants (`primary`, `secondary`, `warning` for destructive actions, `tertiary`, `outlined`, `icon`, `menu-item`, …; see `app/components/Button/Button.component.tsx`) and maintain the design system's spacing and typography (see `DESIGN.md`).

### File System Access API
- **Safe Closure**: Always close `FileSystemWritableFileStream` in a `finally` block to prevent file locks.
- **Fresh Handles**: Obtain new `FileSystemHandle` objects before move/rename operations to avoid "state changed" errors.

### State Management (Jotai)
- **Atomic State**: Use atoms defined in `app/atoms/` for global state.
- **Isolation**: When testing, always wrap components in a `<Provider>` to ensure fresh state.

---

## 🧪 Testing Standards (Vitest)

- **100% Mocking**: Mock ALL external APIs, hooks (especially `useFileSystem`), and network requests. No real side effects.
- **Behavioral Focus**: Test user interactions and state changes, not CSS classes or internal implementation details.
- **Tests With Changes**: Add or update tests alongside every behavior change. Don't run the build or test suite automatically after each edit — run them when the user asks; CI runs the full suite on every pull request. Never push changes that break the test suite.
- **Router Mocking**: Always mock `useRouter` from `next/navigation` to avoid "app router not mounted" errors.

---

## 📚 Documentation & Maintenance

- **Plan Location**: Save all implementation plans in `next-client/.plans/`.
- **Mandatory Docs**: Every component has a sibling `<ComponentName>.md` (e.g. `MarkdownEditor.tsx` → `MarkdownEditor.md`) explaining its purpose, state, props, and logic; directories keep a `README.md` index. Update the doc in the same change as the component.
- **Small Files**: Keep source files under **400 lines** (tests excluded). If a file grows larger, refactor by extracting subcomponents, hooks, data modules, or utility functions.
- **Small Edits**: Prefer minimal, precise changes over large-scale rewrites unless explicitly instructed.
