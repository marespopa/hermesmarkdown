# ToolSkeletons

Description: The loading outlines of the five tools, shown by each tool's loader (`next/dynamic`'s `loading`) while the tool's code loads: `CleanerSkeleton`, `MermaidSkeleton`, `TableSkeleton`, `TokenCostSkeleton` and `TokenizerSkeleton`. Each mirrors its tool's layout and sizes so the tool lands in place without a shift: the example chips (by their real labels, from `cleaner-examples.ts` / `tokenizer-examples.ts`, drawn as empty outlines), segmented controls, form fields at the real components' heights (Input 42px, the textareas' 420px / 180px minimums, the Select's 44px, with label and helper lines), panels (`rounded-2xl` raised surface), stat tiles, the Token Cost table with one row per `MODEL_PRICES` model, the table generator's default 3 × 2 grid on the editor's paper sheet, and the action buttons (44px). Text is stood in by bars set in a line box of the real text's type, so each takes that text's height. Each outline is a `role="status"` region named "Loading tool" with screen-reader text; the shapes are `aria-hidden` and pulse only when motion is allowed.

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `CLEANER_EXAMPLES`, `TOKENIZER_EXAMPLES`, `MODEL_PRICES` (static data only, no tool code).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import dynamic from "next/dynamic";
import { TableSkeleton } from "../components/ToolSkeletons";

const TableTool = dynamic(() => import("./TableTool"), { ssr: false, loading: () => <TableSkeleton /> });
```
