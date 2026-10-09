# Standalone Markdown tools (table generator, Mermaid live editor) — engineering PRD

## Context
Product intent: offer two free, single-purpose web tools that people already search for, a **Markdown table generator** and a **Mermaid live editor**, on the main domain. Each tool page is useful by itself (copy the Markdown, download the SVG) and ends with **Open in HermesMarkdown**, which carries the result into the editor's draft. Source: the product brief in the request of 2026-10-09. Decisions already made with the user: use paths, not subdomains (single Netlify site, `netlify.toml` base `next-client`); the handoff is same-origin through `sessionStorage` into the existing draft import flow, with no server round-trip; tool pages load only the table code or `mermaid`, never the workspace bundle.

What already exists:
- **E1. Table grid.** The visual grid is the CodeMirror widget `tableDisplayExtension` (`app/editor/codemirror/table-display.tsx:231`). It handles cell editing, rulers and menus, sort, align, move, paste-a-grid and formulas. Its import graph stays inside `@codemirror/{state,view,commands,language}`, the `table-*` modules, `utils/formula-engine` + `utils/formula/*`, `utils/inline-markdown` and `app/utils/platform`. Nothing from the workspace (atoms, file system, panes) is imported. The table key bindings are inlined in `codemirror/extensions.ts:112-125`. The editor-free helpers live in `utils/table-manipulation.ts` (`detectDelimitedTable` :205, `delimitedTextToMarkdownTable` :220), `tableParser.ts` and `tableSerializer.ts#serializeTable`.
- **E2. `/table` slash entry.** It only inserts `DEFAULT_TABLE` (`codemirror/slash-menu.ts:138`). There is no dialog and no reusable "empty table of N×M" builder.
- **E3. Mermaid rendering.** `app/editor/utils/render-mermaid.ts#renderMermaid` lazy-loads `mermaid` (^11.16), serializes renders and sets `securityLevel: "strict"`. Theme selection follows `html.dark` (`utils/rendered-block-cache.ts#currentRenderTheme`, which also pulls in `render-math`, so the tool must not import it).
- **E4. Mermaid viewer.** `app/editor/components/MermaidDialog.tsx` (190 lines) has zoom, fit, pointer-pan and SVG download. The viewer is fused with the dialog and the `hermes:open-mermaid-dialog` event listener, and it auto-fits on every new SVG (:95-106).
- **E5. Draft import.** `app/editor/hooks/use-draft-import.ts` and `components/DraftImportDialog.tsx` are mounted in `app/editor/page.tsx:138,266`.
- **E6. Marketing/SEO pattern.**
  - `app/markdown-editor/{layout,page}.tsx` and `app/what-is-hermes-md/` set `metadata` (title, description, canonical, openGraph, twitter) and inline FAQPage JSON-LD.
  - `app/sitemap.ts` is a hand-written list; `app/robots.ts` already allows `/`.
  - `MainPage` (root layout) shows `Header` and `Footer` on every non-`/editor` route.
- **E7. Analytics.** `MainPage.tsx` already loads the cookieless LiteAnalytics page-view script in production on every route, and `app/privacy-policy/page.tsx:73-85` discloses it.

What is missing or broken:
1. **Broken: import writes into whatever tab is active.** `useDraftImport#handleFileChange` (:26-43) and `confirmPendingDraft` (:45-51) call `setContent`/`setFileName`. Those are `atom_content`/`atom_fileName`, which write to the **active** tab (`atoms/file-atoms.ts:76-113`). The emptiness check also reads the active tab. So with a vault note open, an import is offered against that note and, on confirm, replaces the note's buffer, which autosave then writes to disk. The draft slot is never targeted.
2. No handoff contract (storage key, payload, limits, expiry) and nothing on `/editor` that reads one.
3. Arriving on `/editor` has three side effects that would hide imported text. `useVaultOpenBehavior` opens the home feed over it (once per vault per tab). First-time visitors, who are the tools' main audience, get the 7-step `WelcomeWizard` (`WelcomeWizard.tsx:70`).
4. No `/tools/*` routes, tool catalog, shared tool-page shell, structured data, sitemap entries or nav/footer links.
5. No standalone table editor: a minimal CodeMirror host plus the shared table keymap.
6. No standalone Mermaid editor, and the viewer can't be reused outside the dialog (E4).
7. No user documentation for the tools or the handoff.

## Behavior

### Routes
| Path | Page |
|---|---|
| `/tools` | Hub: short intro and one card per tool. |
| `/tools/markdown-table-generator` | Markdown table generator. |
| `/tools/mermaid-live-editor` | Mermaid live editor. |

The slugs match the head search terms ("markdown table generator", "mermaid live editor"). All three pages render the header and footer like other marketing pages, are indexable, and are listed in the sitemap.

### Tool page layout (both tools)
In order:
1. Breadcrumb (Tools › name).
2. `h1` and a one-line lead.
3. The interactive tool, client-only, with a fixed-height skeleton until it mounts so the layout doesn't shift.
4. "How it works" (three steps).
5. A privacy line: "Runs in your browser. Nothing is uploaded."
6. A pitch block for the workspace with a second **Open in HermesMarkdown** button.
7. FAQ (the same text as the FAQPage JSON-LD).
8. Links to the other tools.

Everything except the tool itself is server-rendered.

### Markdown table generator
- On first visit, the grid shows an empty 3-column × 2-row table with headers `Header 1…3`.
- The grid is the same widget as the editor's. It supports typing in cells, Tab/Shift-Tab/Enter navigation, the row/column rulers and menus (insert, delete, move, sort, align, copy as CSV/JSON), Alt+↑/↓ to move rows, pasting a spreadsheet range into a cell, and undo/redo (Ctrl/Cmd+Z).
- **Size + New table.** Two number inputs (columns 1–20, rows 1–100) and a **New table** button. The button replaces the grid with an empty table of that size as one undoable change. No confirmation.
- **From CSV / TSV.** A collapsible panel with a textarea and a **Convert** button.
  - Text that `detectDelimitedTable` recognizes replaces the grid, via `delimitedTextToMarkdownTable`.
  - Other text shows the helper message "Couldn't find comma- or tab-separated columns." and leaves the grid alone.
- **Output.** A read-only monospace block shows the current Markdown, kept in sync with the grid.
  - **Copy Markdown** copies it and shows the copy toast.
- **Open in HermesMarkdown** hands off `# Markdown table\n\n<table>\n` (see Handoff).
- If every table is deleted (the "Delete table" menu entry), the output is empty, Copy and Open are disabled, and a hint says "Start a new table above."
- The working table persists in the tab's `sessionStorage` (`hermes_tool_table`). Refresh and browser Back from `/editor` restore it. A new tab starts fresh.

### Mermaid live editor
- Two panes: source on the left and preview on the right, stacked below 768px.
- First visit shows the flowchart example.
- **Source.** A monospace textarea with spellcheck off. The preview re-renders 400 ms after the last keystroke. The theme follows the app theme (`html.dark` → `dark`, else `default`) and re-renders when the theme toggles.
- **Errors.** A syntax error shows Mermaid's message under the preview. The last good diagram stays visible, dimmed. An empty source shows the hint "Type a diagram to see it here."
- **Preview.** It uses the editor's viewer controls: zoom in/out, fit, pointer-pan and **Download SVG** (`diagram.svg`). The diagram is fitted once, on the first render and when an example is loaded. After that, live re-renders keep the user's zoom.
- **Examples.** A select with flowchart, sequence, class, state, ER, Gantt, pie and mindmap examples.
  - If the source is empty or equals an unmodified example, choosing one replaces it.
  - Otherwise the app-wide confirm dialog (`useDialog`) asks "Replace your diagram with the <name> example?" first.
- **Copy Markdown** copies the fenced block. The fence is longer than any backtick run in the source, minimum 3.
- **Open in HermesMarkdown** hands off `# Mermaid diagram\n\n<fenced block>\n`. Both buttons are disabled while the source is blank.
- The source persists in `sessionStorage` (`hermes_tool_mermaid`), with the same rules as the table tool.

### Handoff (both tools → `/editor`)
- Clicking **Open in HermesMarkdown**:
  1. writes the payload to `sessionStorage["hermes_tool_handoff"]`;
  2. navigates in the **same tab** with `router.push("/editor")`.
- `sessionStorage` is per tab, so a new tab would not see the payload; that is why the navigation stays in the same tab.
- Over the size limit, or if storage throws (quota, blocked storage), the app doesn't navigate. It shows the error toast "Too large to open in the workspace. Copy the Markdown instead." or "Couldn't open the workspace from here. Copy the Markdown instead." respectively.
- On `/editor`:
  1. While a valid payload is pending, the first-run `WelcomeWizard` is deferred for this page visit; it shows on the next `/editor` visit. Opening it explicitly (`atom_isWizardOpen`) still works.
  2. The payload is applied once the vault has settled: not restoring, not waiting on Restore Access, and the open-vault behavior has already run for this vault (or for "no vault").
  3. **Draft empty** (`atom_openFiles.draft.content` blank): the draft tab is opened in the active pane (added if absent), filled with the Markdown and named after the title ("Markdown table" / "Mermaid diagram"). The home feed closes and the editor is focused.
  4. **Draft has text**: `DraftImportDialog` asks "Overwrite draft with "Markdown table"?". **Overwrite** applies it as in step 3. **Cancel** keeps the draft untouched, discards the payload and shows the toast "Kept your current draft." Nothing is ever written into a vault note's tab (fixes item 1).
  5. The storage key is removed when the payload is applied or offered. A refresh afterwards does not import again.
  6. Invalid, expired (> 15 min) or oversized payloads are removed silently and ignored.
- Afterwards the draft behaves like any draft:
  - **Local folder, browser (OPFS) vault or GitHub vault:** it saves itself on autosave once its first line is settled. The `# Markdown table` heading makes the line settled, so the file is named "Markdown table.md" (made unique by `createUniqueFile`) after the usual folder prompt. In a GitHub vault, the file becomes a local change to commit like any new note.
  - **No vault:** the text stays in the draft (persisted in `openFiles` localStorage), and Save exports a download named after the title.
  - **Mobile:** same flow; `atom_openDraft` targets the single visible pane.

### Analytics
No new analytics. The existing cookieless page-view script in `MainPage` covers `/tools/*` like every marketing page. No events, no query parameters (`?from=tool`) and no new requests.

## Design

### Handoff contract — `app/utils/tool-handoff.ts` (new, dependency-free)
This module is shared by the tool pages and the editor. It must not import atoms or editor code.
```ts
export const TOOL_HANDOFF_KEY = "hermes_tool_handoff";
export const MAX_HANDOFF_CHARS = 200_000;          // markdown length
export const HANDOFF_TTL_MS = 15 * 60_000;
export type ToolHandoffSource = "markdown-table" | "mermaid";
export interface ToolHandoff {
  v: 1;
  source: ToolHandoffSource;
  title: string;      // 1–60 chars; becomes the draft's fileName
  markdown: string;   // ≤ MAX_HANDOFF_CHARS
  createdAt: number;  // Date.now() at write
}
export function buildToolHandoff(source: ToolHandoffSource, title: string, markdown: string, now?: number): ToolHandoff;
export function parseToolHandoff(raw: string | null, now?: number): ToolHandoff | null;
// Returns null for: bad JSON, v !== 1, unknown source, non-string fields,
// empty/oversized markdown, title outside 1–60 chars, createdAt older than TTL or >60 s in the future.
export type WriteResult = "ok" | "too-large" | "storage-error";
export function writeToolHandoff(handoff: ToolHandoff, storage?: Storage): WriteResult;   // try/catch around setItem
export function readToolHandoff(storage?: Storage, now?: number): ToolHandoff | null;      // removes the key when invalid
export function clearToolHandoff(storage?: Storage): void;
```
`storage` defaults to `window.sessionStorage`, guarded the same way as `tabSessionStorage`. 200k characters stays well inside the ~5 MB storage quota and leaves room in `openFiles` (localStorage), where the draft is persisted afterwards.

### Handoff Markdown — `app/tools/utils/tool-markdown.ts` (new, pure)
```ts
export const TABLE_HANDOFF_TITLE = "Markdown table";
export const MERMAID_HANDOFF_TITLE = "Mermaid diagram";
export function mermaidFence(source: string): string;         // fence = max(3, longest backtick run + 1)
export function tableHandoffMarkdown(table: string): string;  // `# Markdown table\n\n${table.trim()}\n`
export function mermaidHandoffMarkdown(source: string): string;
```
The editor detects Mermaid by `FencedCode` + `CodeInfo` (`rendered-block.ts:43-46`), so a longer fence still renders.

### Draft import — `app/editor/hooks/use-draft-import.ts` (changed)
- Add `offerDraft(draft: PendingDraft): void`, which reads `store.get(atom_openFiles).draft?.content`:
  - blank → `applyDraft(draft)`;
  - otherwise → `setPendingDraft(draft)`.
- Add a private `applyDraft(draft)`:
  1. `openDraft()` (`atom_openDraft`, `file-atoms.ts:244`);
  2. `store.set(atom_openFiles, prev => ({ ...prev, draft: { ...(prev.draft ?? EMPTY_DRAFT), content: text, fileName: name } }))`;
  3. `store.set(atom_draftFolderDeclined, false)`;
  4. `setHomeFeedOpen(false)`;
  5. `focusPaneEditorWhenReady(store.get(atom_activePaneId))`.
- `handleFileChange` and `confirmPendingDraft` call `offerDraft` / `applyDraft`. The `atom_content` / `atom_fileName` writes are removed (fixes item 1).
- `PendingDraft` gains `origin?: "file" | "tool"`. The file path passes `"file"`; `useToolHandoff` passes `"tool"`.
- `cancelPendingDraft` clears the pending draft and, when `origin === "tool"`, shows `toast("Kept your current draft.")`.
- The return value gains `offerDraft`.

### Arrival — `app/editor/hooks/use-tool-handoff.ts` (new)
```ts
export function useToolHandoff(options: { offerDraft: (draft: PendingDraft) => void; isVaultLocked: boolean }): void;
```
1. On mount, `readToolHandoff()` into a ref. If a payload is found, `setWelcomeDeferred(true)`.
2. In an effect: when the ref holds a payload, `!isVaultLocked`, and `appliedFor === (hasVault ? vaultKey : NO_VAULT_KEY)`, do `clearToolHandoff()`, clear the ref, then `offerDraft({ text: markdown, name: title, origin: "tool" })`. The inputs are `atom_vaultOpenBehaviorAppliedFor`, `atom_vaultKey`, `atom_vaultHandle` and `NO_VAULT_KEY` from `use-vault-open-behavior.ts:7`.

Gating on `appliedFor` makes the order independent of `useVaultOpenBehavior`'s effect: the feed has already been opened when the draft is applied, and `applyDraft` closes it. A ref plus clear-on-consume guards against StrictMode double effects. A payload read while Restore Access is pending waits in the ref. The TTL is only checked at read.

### Welcome deferral
- `atom_welcomeDeferred = atom(false)` in `app/atoms/ui-atoms.ts`, next to `atom_isWizardOpen` (:188). It is in-memory, so it resets on reload.
- `WelcomeWizard.tsx:70` becomes `showWizard = isMounted && (isWizardOpen || (!hasCompleted && !welcomeDeferred))`.

### Tool state — `app/atoms/tool-atoms.ts` (new)
```ts
export const atom_tableToolMarkdown = atomWithStorage<string>("hermes_tool_table", "", createJSONStorage(tabSessionStorage), { getOnInit: true });
export const atom_mermaidToolSource = atomWithStorage<string>("hermes_tool_mermaid", "", createJSONStorage(tabSessionStorage), { getOnInit: true });
```
- `""` means "never edited": the tool shows its default table or example.
- Move `tabSessionStorage` from `ui-atoms.ts:147-153` into `app/atoms/session-storage.ts` (exported), and import it in both files.
- Re-export from `atoms.ts` for consistency, but tool code imports `@/app/atoms/tool-atoms` directly so the barrel never enters the tool chunks.

### Tool catalog and shell
- **`app/tools/content/tools.ts`**: the single source for the hub, pages, sitemap and footer.
  ```ts
  export interface ToolEntry {
    slug: "markdown-table-generator" | "mermaid-live-editor";
    name: string; title: string; description: string; lead: string;
    keywords: string[];
    steps: [string, string, string];
    faq: { q: string; a: string }[];
    features: string[];
  }
  export const TOOLS: ToolEntry[];
  export function toolBySlug(slug: ToolEntry["slug"]): ToolEntry;
  export function toolMetadata(tool: ToolEntry): Metadata; // title, description, keywords, alternates.canonical "/tools/<slug>", openGraph (type "website", /assets/og-image.jpg), twitter
  ```
  Per-tool copy lives in `app/tools/content/markdown-table-generator.ts` and `mermaid-live-editor.ts` so each file stays small.
- **`app/tools/components/tool-json-ld.ts`**: `toolJsonLd(tool)` returns three objects:
  - `WebApplication`: name, url, `applicationCategory: "DeveloperApplication"`, `operatingSystem: "Any"`, `browserRequirements: "Requires JavaScript"`, `isAccessibleForFree: true`, `offers` price 0, `featureList`, `creator` Person "Mares Popa";
  - `FAQPage`;
  - `BreadcrumbList` (Home › Tools › name).

  Serialize with `JSON.stringify(x).replace(/</g, "\\u003c")`, per `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`.
- **`app/tools/components/ToolShell.tsx`**: a server component, `{ tool: ToolEntry; openInWorkspace: ReactNode; children: ReactNode }`. It renders the page sections in the order listed under Behavior and the JSON-LD scripts. Styling: design tokens only (`bg-surface`, `bg-surface-raised`, `text-fg`, `text-fg-muted`, `border-edge`, `text-ui-*`), matching the spacing of `markdown-editor/page.tsx`. Links use `next/link`.
- **`app/tools/components/OpenInWorkspaceButton.tsx`** (client):
  - Props: `{ source: ToolHandoffSource; title: string; getMarkdown: () => string; disabled?: boolean; variant?: "primary" | "outlined" }`.
  - On click, `writeToolHandoff(buildToolHandoff(...))`. `"ok"` → `router.push("/editor")`; the other results show the error toasts from Behavior via `showErrorToast` (`components/Toastr`).
  - Each tool renders it twice, in the action bar and in the pitch block. The pitch-block copy reads the same atom, so both buttons stay in sync.

### Table tool
- **Why a minimal CodeMirror, not a lighter React grid:** the grid UX lives in about 3.3k lines of `table-*` code (rulers, menus, paste, sort, move, keyboard model). Re-implementing it as a React table would fork the behavior and the bugs, and the tool would no longer show the real editor experience it is meant to sell. The CM core plus `lang-markdown` (without `language-data`) is a modest client chunk. It loads only on this route, via `next/dynamic({ ssr: false })` from a client component (Server Components can't use `ssr: false`; see `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`).
- **`app/editor/codemirror/table-keymap.ts`** (new): `export const tableKeyBindings: KeyBinding[]`, moved verbatim from `extensions.ts:112-125`. `extensions.ts` uses `keymap.of(tableKeyBindings)` and drops the nine individual imports.
- **`app/tools/table/table-tool-extensions.ts`** (new):
  ```ts
  export function tableToolExtensions(onDocChange: (doc: string) => void): Extension[];
  // [editorTheme(), history(), drawSelection(),
  //  markdown({ base: markdownLanguage, addKeymap: false }),   // no codeLanguages
  //  tableDisplayExtension, keymap.of(tableKeyBindings),
  //  keymap.of([...historyKeymap, ...defaultKeymap]), EditorView.lineWrapping,
  //  EditorView.updateListener.of(u => u.docChanged && onDocChange(u.state.doc.toString()))]
  ```
  `editorTheme` is `codemirror/theme.ts#editorTheme`; its only app import is `MONO_FONT_STACK` from `ui-atoms`.
- **`app/editor/utils/table-manipulation.ts`** (+~15 lines, 286 → ~300): `export function createEmptyTable(cols: number, rows: number): string` returns headers `Header 1..n`, a `---` separator and blank rows, via `serializeTable`.
- **`app/tools/table/TableGridEditor.tsx`** (client; default export so it can be loaded dynamically):
  - Props: `{ value: string; onChange(doc): void; replaceRequest: { doc: string; id: number } | null }`.
  - It creates one `EditorView` on mount, inside a `div.editor-sheet` (global table CSS comes from `editor.scss`, imported in the root layout).
  - It applies `replaceRequest` as a single dispatch (`changes: {from:0,to:len,insert}`), which keeps the replacement undoable, and destroys the view on unmount.
- **`app/tools/table/TableTool.tsx`** (client):
  - Owns `atom_tableToolMarkdown`. `""` → `createEmptyTable(3, 2)`.
  - Renders the size `Input`s (type number, `validation`), the New table `Button` (secondary), the CSV panel (`Textarea`, Convert `Button`), the dynamic grid with a skeleton, and the output `<pre>`.
  - Copy uses `navigator.clipboard.writeText` + `showCopyToast`; Open uses `OpenInWorkspaceButton`.
  - Disabled states: empty output or `tableHandoffMarkdown(md).length > MAX_HANDOFF_CHARS`.
  - Split the CSV panel into `TableCsvImport.tsx` if the file nears 250 lines.

### Mermaid tool
- **`app/editor/components/MermaidViewer.tsx`** (new, extracted from `MermaidDialog.tsx:16-26,33-40,80-186`):
  - Props: `{ svg: string | null; loading?: boolean; error?: string | null; fit?: "always" | "first"; fitRequest?: number; className?: string; downloadName?: string }`.
  - It owns scale, diagramSize, drag and the toolbar.
  - `fit: "always"` (the dialog's current behavior) refits on every new SVG. `"first"` fits on the first SVG and whenever `fitRequest` changes.
  - It exports `getDiagramSize` for tests.
  - `MermaidDialog.tsx` keeps the event listener, open state and render call, and renders `<MermaidViewer fit="always" />` inside `DialogModal`, which takes it to about 80 lines.
  - Error text uses the `text-accent` token in place of `text-red-500`.
- **`app/tools/mermaid/mermaid-examples.ts`**: `export const MERMAID_EXAMPLES: { id; label; source }[]` (8 entries, flowchart first).
- **`app/tools/mermaid/use-live-mermaid.ts`**:
  ```ts
  export function useLiveMermaid(source: string, delayMs = 400): { svg: string | null; error: string | null; loading: boolean };
  ```
  - Debounces, then calls `renderMermaid(source, theme)` from `editor/utils/render-mermaid.ts`.
  - Ignores stale results with a render id.
  - Keeps the last good SVG when there is an error.
  - Watches `html.dark` with a `MutationObserver` (the same pattern as `rendered-block.ts:280-292`).
- **`app/tools/mermaid/MermaidTool.tsx`** (client): owns `atom_mermaidToolSource` (`""` → example 1) and renders the examples `Select`, the source `Textarea`, `MermaidViewer fit="first"`, Copy Markdown and `OpenInWorkspaceButton`. The page loads it with `dynamic(..., { ssr: false })` through a small client loader, with a skeleton. `mermaid` is already only fetched on the first render.
- **`app/components/Input/Textarea.component.tsx`**: add `textareaClassName?: string`, forwarded to the `<textarea>` (today `className` styles only the wrapper and `font-sans` is fixed). The source pane needs `font-mono` and its own height.

### Bundle boundary (both pages)
The route chunks for `/tools/*` must not import, even transitively:
- `app/atoms/atoms.ts` (barrel) or `file-atoms` / `vault-atoms`;
- `app/hooks/use-file-system`;
- `app/editor/page.tsx`, or anything under `app/editor/components/` except `MermaidViewer`;
- `codemirror/extensions.ts`;
- `@codemirror/language-data`;
- `rendered-block-cache.ts`.

The table page must not reference `mermaid`, and the Mermaid page must not reference `@codemirror/*`. The shared root shell (`MainPage`: header, palette, toasts) is what every marketing page already ships and is out of scope.

## Phase 1: Handoff contract and editor arrival
Fixes items 1–3. Shippable alone: no visible change except the import fix.
- `app/utils/tool-handoff.ts`: new, as in Design.
- `app/atoms/session-storage.ts`: new; move `tabSessionStorage` here from `app/atoms/ui-atoms.ts:144-153` and import it in `ui-atoms.ts`.
- `app/atoms/ui-atoms.ts`: add `atom_welcomeDeferred` after `atom_isWizardOpen` (:188).
- `app/editor/hooks/use-draft-import.ts`: add `offerDraft` and `applyDraft`; rewire `handleFileChange` (:26-43) and `confirmPendingDraft` (:45-51); drop `atom_content`/`atom_fileName`; use `useStore`, `atom_openDraft`, `atom_openFiles`, `EMPTY_DRAFT`, `atom_draftFolderDeclined`, `atom_homeFeedOpen`, `atom_activePaneId`, `focusPaneEditorWhenReady` (`editor/utils/focus-pane-editor.ts`). Update the header comment.
- `app/editor/hooks/use-tool-handoff.ts`: new, as in Design.
- `app/editor/page.tsx` (357 lines → ~362):
  - destructure `offerDraft` from `useDraftImport` (:138);
  - call `useToolHandoff({ offerDraft, isVaultLocked })` right after;
  - leave `DraftImportDialog` (:266) unchanged: the cancel toast lives in `useDraftImport#cancelPendingDraft` (`origin === "tool"`), so `page.tsx` stays flat.
- `app/editor/components/WelcomeWizard.tsx:70`: deferral condition.

## Phase 2: Tools shell, hub, SEO wiring
Covers item 4.
- `app/tools/content/tools.ts`, `markdown-table-generator.ts`, `mermaid-live-editor.ts`: new catalog and copy. Titles and descriptions:
  - Table: title "Markdown Table Generator — Free, Visual, Private | HermesMarkdown"; description "Build Markdown tables in a spreadsheet-style grid: add rows and columns, align, sort, paste from Excel or CSV, and copy clean GitHub-flavored Markdown. Runs in your browser; nothing is uploaded."
  - Mermaid: title "Mermaid Live Editor — Live Preview & SVG Export | HermesMarkdown"; description "Write Mermaid flowcharts, sequence diagrams and Gantt charts with a live preview, zoom and SVG download. Free, no sign-up, and your diagram never leaves your browser."
  - Hub: title "Free Markdown Tools | HermesMarkdown".
  - Keywords include "markdown table generator", "csv to markdown table", "excel to markdown table", "mermaid live editor", "mermaid editor online", "mermaid to svg".
  - FAQ: 4–5 entries per tool, including "Is my data uploaded?" (no) and "Can I keep editing it later?" (Open in HermesMarkdown).
- `app/tools/components/ToolShell.tsx`, `tool-json-ld.ts`, `OpenInWorkspaceButton.tsx`: new.
- `app/tools/components/ToolCard.tsx`: new hub card (server component; `next/link`).
- `app/tools/page.tsx`: hub with `metadata` (canonical `/tools`), an `h1`, one card per tool and BreadcrumbList JSON-LD.
- `app/sitemap.ts`: add `/tools` (monthly, 0.7) and one entry per `TOOLS` item (`/tools/${slug}`, monthly, 0.8), generated from the catalog.
- `app/robots.ts`: no change (already `allow: "/"`).
- `app/components/Header/Navigation/NavigationLinks.tsx`: add `<NavigationLink label="Tools" href="/tools" />` between Documentation and Contact. Make the same addition in `MobileNavigationLinks.tsx`.
- `app/components/Footer/Footer.component.tsx:41-44`: add both tool links (names from `TOOLS`).

## Phase 3: Markdown table generator
Covers item 5. Depends on 1–2.
- `app/editor/codemirror/table-keymap.ts`: new; `app/editor/codemirror/extensions.ts:112-125` uses it.
- `app/editor/utils/table-manipulation.ts`: `createEmptyTable`.
- `app/atoms/tool-atoms.ts`: new (both atoms; the Mermaid one is used in phase 4). Re-export from `app/atoms/atoms.ts`.
- `app/tools/utils/tool-markdown.ts`: new.
- `app/tools/table/table-tool-extensions.ts`, `TableGridEditor.tsx`, `TableTool.tsx`, `TableToolLoader.tsx` (client: `dynamic(() => import("./TableTool"), { ssr: false, loading: Skeleton })`): new. The optional `TableCsvImport.tsx` is described in Design.
- `app/tools/markdown-table-generator/page.tsx`: `export const metadata = toolMetadata(toolBySlug("markdown-table-generator"))`; renders `<ToolShell tool=… openInWorkspace={<TableOpenButton/>}><TableToolLoader/></ToolShell>`. `TableOpenButton` is a tiny client wrapper reading `atom_tableToolMarkdown`; keep it in `TableTool.tsx`'s folder.

## Phase 4: Mermaid live editor
Covers item 6. Depends on 1–2. Can ship before 3.
- `app/editor/components/MermaidViewer.tsx`: new (extraction). `MermaidDialog.tsx`: slimmed to use it.
- `app/components/Input/Textarea.component.tsx`: `textareaClassName`.
- `app/tools/mermaid/mermaid-examples.ts`, `use-live-mermaid.ts`, `MermaidTool.tsx`, `MermaidToolLoader.tsx`: new.
- `app/tools/mermaid-live-editor/page.tsx`: same pattern as phase 3.

## Phase 5: Documentation
Covers item 7. See Docs.

## Tests
All tests are fully mocked: `next/navigation` `useRouter` (assert `push`), `react-hot-toast`/`Toastr`, `navigator.clipboard`, `sessionStorage` (jsdom's, or a stub whose `setItem` throws), `render-mermaid` (`vi.mock` resolving fixed SVG / rejecting), and `next/dynamic` where a loader is rendered. Jotai: wrap in `<Provider>` with a fresh `createStore()`.

**Phase 1**
- `app/utils/tool-handoff.test.ts`:
  - build → write → read round-trip;
  - `parseToolHandoff` rejects bad JSON, `v: 2`, unknown source, empty markdown, oversized markdown, titles of 0 and 61 characters, expired payloads (`createdAt` 16 min ago) and payloads more than 60 s in the future;
  - `readToolHandoff` removes an invalid key;
  - `writeToolHandoff` returns `"too-large"` without touching storage, and `"storage-error"` when `setItem` throws.
- `app/editor/hooks/use-draft-import.test.tsx` (new; `renderHook` with a store and mocked `importFile`):
  - empty draft: `offerDraft` puts the text and name into `openFiles.draft`, makes `draft` the active pane's `activeFilePath`, and sets `atom_homeFeedOpen` false;
  - draft with text: `pendingDraft` is set and nothing changes;
  - `confirmPendingDraft` applies it; `cancelPendingDraft` leaves the draft and clears `pendingDraft`, and toasts "Kept your current draft." only for `origin: "tool"`;
  - **regression:** with a vault note (`notes/a.md`) active and holding text, a fallback file import never changes `openFiles["notes/a.md"].content`.
- `app/editor/hooks/use-tool-handoff.test.tsx`:
  - no key → `offerDraft` is not called;
  - valid key + `isVaultLocked: true` → not called, but `atom_welcomeDeferred` is true;
  - unlocking with `appliedFor` mismatched → still not called; matching `appliedFor` → called once with `{ text, name }` and the key is removed;
  - re-render or remount after consume → not called again;
  - expired key → removed and not called.
- `app/editor/components/WelcomeWizard.test.tsx`: with `hasCompletedOnboarding` false and `atom_welcomeDeferred` true, the wizard is not shown; with `atom_isWizardOpen` true it is.

**Phase 2**
- `app/sitemap.test.ts` (new): includes `/tools`, `/tools/markdown-table-generator` and `/tools/mermaid-live-editor`; all URLs are unique.
- `app/tools/content/tools.test.ts`:
  - slugs are unique;
  - every entry has 4+ FAQs;
  - `toolMetadata` sets the canonical to `/tools/<slug>`;
  - titles and descriptions are within 70 and 170 characters;
  - JSON-LD from `toolJsonLd` contains the FAQ questions and escapes `<`.
- `app/tools/components/OpenInWorkspaceButton.test.tsx`:
  - click writes a parseable payload with the given source and title, then `push("/editor")`;
  - `"too-large"` / `"storage-error"` → error toast and no `push`;
  - `disabled` → no write.
- `app/tools/page.test.tsx`: the hub renders a link to each tool.
- `NavigationLinks.test.tsx`: Tools link to `/tools`. `Footer.test.tsx`: both tool links.

**Phase 3**
- `app/editor/utils/table-manipulation.test.ts`: `createEmptyTable(3,2)` parses with `parseTable` to 3 headers and 2 empty rows; it clamps or validates bounds.
- `app/editor/codemirror/table-keymap.test.ts`: exports the 12 bindings, keyed as before. `extensions.test.ts` keeps passing.
- `app/tools/table/table-tool-extensions.test.ts`: `EditorState.create({ doc: createEmptyTable(2,1), extensions })` has one `tableDisplayField` match. A doc change calls `onDocChange` (create an `EditorView` in jsdom).
- `app/tools/utils/tool-markdown.test.ts`: table heading and trailing newline; Mermaid fence is 3 backticks normally and 4 when the source contains a backtick triple.
- `app/tools/table/TableTool.test.tsx` (mock `TableGridEditor` with a stub that renders `value` and exposes `onChange`):
  - empty atom → default table in the output;
  - New table with 4×3 → a replace request with 4 columns;
  - Convert with CSV → grid replaced; non-CSV → helper text and no replace;
  - Copy → clipboard receives the output;
  - empty output disables Copy and Open.

**Phase 4**
- `app/editor/components/MermaidViewer.test.tsx`:
  - renders the given SVG and the 100% label;
  - Zoom in changes the label to 125%;
  - Download creates and revokes an object URL (mock `URL.createObjectURL`);
  - `getDiagramSize` parses a `viewBox`;
  - `fit="first"` does not refit when `svg` changes (assert via a `fitRequest` spy or the scale label).
- `MermaidDialog`: add a minimal test that dispatching `hermes:open-mermaid-dialog` renders the viewer.
- `app/tools/mermaid/use-live-mermaid.test.ts` (fake timers): renders after 400 ms, not before; a stale result is dropped; an error keeps the previous SVG and sets `error`.
- `app/tools/mermaid/MermaidTool.test.tsx`:
  - first render uses example 1;
  - choosing an example over edited text calls the mocked `useDialog().confirm`; declining keeps the source;
  - Copy Markdown copies the fenced block;
  - a blank source disables Copy and Open.

## Docs
- New sibling docs: `app/tools/components/{ToolShell,OpenInWorkspaceButton,ToolCard}.md`, `app/tools/table/{TableTool,TableGridEditor}.md`, `app/tools/mermaid/MermaidTool.md`, `app/editor/components/MermaidViewer.md`. Each covers purpose, state, storage, props and "Zero-cloud: no network; writes only `sessionStorage`".
- New `app/tools/README.md`: route list, catalog, handoff contract (key, payload, limits, TTL, arrival rules) and the bundle boundary.
- Update:
  - `app/editor/components/MermaidDialog.md` (uses `MermaidViewer`);
  - `DraftImportDialog.md` (also shown for tool handoffs; the `origin` field);
  - `WelcomeWizard.md` (deferral);
  - `app/editor/README.md` hooks table (`use-tool-handoff.ts`; `use-draft-import.ts` now targets the draft slot);
  - `app/editor/components/README.md` (`MermaidViewer`);
  - `app/atoms/README.md` (`tool-atoms.ts`, `session-storage.ts`, `atom_welcomeDeferred`);
  - `app/components/Header/Header.md`, `Footer/Footer.md` (Tools links);
  - `app/components/Input/Input.md` (`textareaClassName`);
  - `app/README.md` directory list (`tools/`);
  - `next-client/ARCHITECTURE.md` Runtime Components: one bullet "Free tools (`app/tools/`)" describing the `sessionStorage` handoff into the draft.
- In-app: new `app/documentation/content/free-tools.tsx` exporting `freeToolsItems: Subsection[]` with one item, id `free-tools`, title "Free tools". It describes both tools, what Open in HermesMarkdown does (draft, overwrite prompt, nothing uploaded) and links to `/tools`. Add it to the Get started group in `content/index.ts` (`items: [...getStartedGroup.items, ...freeToolsItems]`). `get-started.tsx` is already 429 lines, so don't grow it.
- No "iAWriter"/"Typora" anywhere; never call the file tree a "sidebar"/"rail".

## Acceptance criteria
- [ ] `/tools`, `/tools/markdown-table-generator` and `/tools/mermaid-live-editor` render with the header and footer, a server-rendered `h1`, lead, how-it-works, privacy line, FAQ and related links.
- [ ] Each tool page has a unique title, description, canonical, OG and Twitter metadata, plus `WebApplication`, `FAQPage` and `BreadcrumbList` JSON-LD whose FAQ text matches the visible FAQ. `<` is escaped.
- [ ] `sitemap.xml` lists all three URLs; `robots.txt` is unchanged.
- [ ] The header (desktop and mobile) has a Tools link; the footer links both tools.
- [ ] Table tool: the grid behaves like the editor's (cell typing, Tab/Enter, rulers and menus, sort, align, move, paste a spreadsheet range, undo); New table with a size; CSV/TSV convert with an error hint; the output updates live; Copy Markdown works.
- [ ] Mermaid tool: live preview after a ~400 ms pause; the error keeps the last good diagram; zoom/fit/pan/Download SVG work; zoom survives edits; examples work and ask before replacing edited text; the theme follows the app theme.
- [ ] Refresh and Back from `/editor` restore each tool's work in the same tab.
- [ ] Open in HermesMarkdown with an empty draft lands on `/editor` with the draft tab active, holding `# Markdown table` / `# Mermaid diagram` plus the content, with no home feed covering it, for: no vault, local folder vault, browser vault and GitHub vault, on desktop and mobile.
- [ ] With text in the draft, the overwrite dialog appears. Overwrite replaces; Cancel keeps the draft and toasts. A vault note open in the active tab is never modified.
- [ ] A first-time visitor arriving from a tool sees the draft, not the wizard. The next `/editor` visit shows the wizard.
- [ ] Refreshing `/editor` after the import does not import again. Payloads that are expired, malformed or over 200k characters are ignored and removed.
- [ ] Over the limit, or with storage blocked, the button shows the error toast and doesn't navigate.
- [ ] No new network requests from `/tools/*` (DevTools Network: only the existing page-view script and same-origin chunks); no new analytics events or URL params.
- [ ] When the user asks for a build: the `/tools/markdown-table-generator` chunks contain no `mermaid`, `/tools/mermaid-live-editor` contains no `@codemirror`, and neither contains `editor/page`, `use-file-system`, `language-data` or the atoms barrel.
- [ ] The Mermaid dialog in the editor behaves exactly as before (zoom, fit, pan, download, auto-fit on open).
- [ ] All new and changed source files are under 400 lines; `MermaidDialog.tsx` shrinks.
- [ ] Project components only (`Button`, `Input`, `Textarea`, `Select`, `DialogModal` via `useDialog`), design tokens only, no hard-coded colors.
- [ ] Tests from the Tests section are added and pass; docs from the Docs section are updated, including the in-app "Free tools" entry.

## Decisions
- **Slugs:** `markdown-table-generator` and `mermaid-live-editor`, plus a `/tools` hub for internal linking and a home for future tools.
- **Table tool hosts a minimal CodeMirror with the real table widget** rather than a separate React grid: one implementation, real product demo, and an acceptable chunk that loads only on that route.
- **Mermaid source is a plain `Textarea`, not CodeMirror**, which keeps the Mermaid page free of `@codemirror`.
- **The handoff Markdown gets an H1** (`# Markdown table` / `# Mermaid diagram`). Without it, a Mermaid draft's first line (```` ```mermaid ````) would name the saved file, and a table's first line would name it after its header row. The H1 also settles the first line for draft autosave.
- **Overwrite rule is about the draft slot**, not the active tab. This also fixes the existing import bug (item 1) rather than layering a second path on top.
- **Cancel discards the payload.** The work is still on the tool page in the same tab (Back), so nothing is lost.
- **Same-tab navigation** (`router.push`), because `sessionStorage` does not reliably carry into `noopener` new tabs.
- **15-minute TTL and 200k-character cap.** Both are generous for real tables and diagrams, prevent a stale import days later in a long-lived tab, and protect the localStorage budget the draft uses afterwards.
- **Tool working state lives in tab `sessionStorage`**, not localStorage. This matches the "nothing kept" promise of a free tool while surviving refresh and Back.
- **Welcome wizard deferred, not marked completed**, when arriving with a payload, so the visitor sees their work first.
- **No new analytics.** The existing cookieless page-view script already counts tool-page visits; there are no click events or attribution params.
- **Reuse `/assets/og-image.jpg`** for tool OG and Twitter images.
- **A shared `tableKeyBindings` module** is the only change to the editor's table code; it avoids duplicating bindings.

## Out of scope / Deferred
- Subdomains, separate Netlify sites, separate root layouts or route groups to slim the shared `MainPage` shell.
- More tools (CSV↔Markdown converter page, TOC generator, Markdown preview); dedicated per-tool OG images; theme selector or PNG export for Mermaid; KaTeX tool.
- A dialog for the in-editor `/table` slash command; new table features inside the workspace.
- Any server route, share link, URL-encoded payloads or cross-tab handoff.
- Click/conversion analytics or UTM parameters.
- Saving a tool result directly into a vault folder from the tool page.

## Open questions
1. **"Mermaid Live Editor" naming.** The official Mermaid project runs mermaid.live under the same name. The slug and title target that search term, but the copy must not imply this is the official tool. Recommended: keep the slug; the lead says "a free, private Mermaid live editor"; the FAQ notes it is independent of the Mermaid project.
2. **Wizard deferral.** Confirm that first-time visitors arriving from a tool should skip onboarding on that visit. The alternative is showing the wizard over their content.
3. **Conversion measurement.** Confirm "no attribution". If the product owner wants to see tool → editor conversions in LiteAnalytics, a `?from=<tool>` param on `/editor` would do it with no new requests, but it shows up in page-view data; this PRD leaves it out.
4. **Overwrite in a vault.** In a vault, the draft could instead be saved as its own note first (as "New note" does in `use-draft-flow.ts`), which avoids the overwrite prompt. This PRD keeps the agreed prompt; confirm.
