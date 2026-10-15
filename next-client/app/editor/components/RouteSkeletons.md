# RouteSkeletons

Description: Loading outlines of the /editor sub-pages, so a refresh on one shows that page's shape while the saved vault loads instead of the editor's. [EditorSkeleton](EditorSkeleton.md) picks one with `routeSkeleton(usePathname())` (null on `/editor` itself) and shows it inside its "Loading vault" status region, on `SUBPAGE_BACKDROP` (the sub-pages' paper). Each mirrors its page's layout and classes:
- `TemplatesSkeleton`: "← Editor" bar, the Templates title and actions, two of your packs as outlined cards with rows, then **Template packs** with every built-in pack's real name, description and templates (`BUILTIN_PACKS` is static), its Add button outlined.
- `TasksSkeleton`: the toolbar (Tasks title, the view tabs by their real names from `TASK_VIEWS`, the filter field at UnifiedSearchInput's height), then two groups of task rows (status ring, text, footnote line).
- `FilesSkeleton`: title, vault name and create buttons, search field, count line, the tree panel with rows.
- `SettingsSkeleton`: the side panel (top strip below `lg`) with "← Editor", the Settings title and section rows, and the open section's title over setting rows.

Text that needs no vault is real; the rest are bars in a line box set in the real text's type (a non-breaking space gives it that height), so the page lands without a shift. Also exports `SKELETON_BAR` (the placeholder fill, static black / white so its opacity works, pulsing only when motion is allowed; EditorSkeleton uses it too).

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `TASK_VIEWS` (`tasks/task-views.ts`), `BUILTIN_PACKS` (`utils/templates/template-packs.ts`), `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { routeSkeleton } from "./RouteSkeletons";

const subpage = routeSkeleton(usePathname()); // null on /editor
```
