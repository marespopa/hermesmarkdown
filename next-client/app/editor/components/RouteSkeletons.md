# RouteSkeletons

Description: Loading outlines of the /editor sub-pages, so a refresh on one shows that page's shape while the saved vault loads instead of the editor's. [EditorSkeleton](EditorSkeleton.md) picks one with `routeSkeleton(usePathname())` (null on `/editor` itself) and shows it inside its "Loading vault" status region, on `SUBPAGE_BACKDROP` (the sub-pages' paper). Each starts with ShellPage's title bar (`TitleHeader`: ← Editor, the real page name and the `SearchPill`'s shape, `SearchPillSkeleton`, exported for the editor's corner too) and mirrors its page's layout and classes:
- `TemplatesSkeleton`: the Templates title and its New template button outlined, two of your packs as outlined cards with rows, then **Examples** with the real list (`TemplateExamples`, static data, its buttons disabled).
- `TasksSkeleton`: the toolbar (Tasks title, the view tabs by their real names from `TASK_VIEWS`, the filter field at UnifiedSearchInput's height), then two groups of task rows (status ring, text, footnote line).
- `FilesSkeleton` (All Files): title, vault name and create buttons, search field, count line, the tree panel with rows.
- `SettingsSkeleton`: the section list (top strip below `lg`) and the open section's title over setting rows.
- `TrashSkeleton`: the Trash title and note, and the item list.
- `ChangesSkeleton`: the Changes title over `ChangesBodySkeleton` (a summary bar and two file section blocks), which the Changes page also shows while its scan has no result yet.
- `ReplaceSkeleton`: the Replace in Files title, two field bars and three row bars.
- `TagsSkeleton`: the tag list beside the notes column.

Text that needs no vault is real; the rest are bars in a line box set in the real text's type (a non-breaking space gives it that height), so the page lands without a shift. Also exports `SKELETON_BAR` (the placeholder fill, static black / white so its opacity works, pulsing only when motion is allowed; EditorSkeleton uses it too).

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `TASK_VIEWS` (`tasks/task-views.ts`), `TemplateExamples` (`templates/components`), `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { routeSkeleton } from "./RouteSkeletons";

const subpage = routeSkeleton(usePathname()); // null on /editor
```
