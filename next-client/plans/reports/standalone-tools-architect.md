# Standalone tools — architect report

## Run 1

**PRD:** `next-client/plans/standalone-tools.md`

### Summary (5 phases)
- **Handoff and arrival (phase 1).**
  - Handoff contract in `app/utils/tool-handoff.ts`: `sessionStorage["hermes_tool_handoff"]`, payload `{ v: 1, source, title, markdown, createdAt }`, 200k-character cap, 15-minute TTL, cleared once used.
  - New `useToolHandoff` on `/editor`: waits until the vault has settled and the open-vault behavior has run, then fills the draft slot, or asks through `DraftImportDialog` if the draft has text.
  - First-run onboarding is deferred for that visit.
- **Pages, metadata and links (phase 2).**
  - Routes: `/tools` (hub), `/tools/markdown-table-generator`, `/tools/mermaid-live-editor`.
  - One catalog (`app/tools/content/tools.ts`) feeds the pages, the metadata (`WebApplication`, `FAQPage` and `BreadcrumbList` structured data), `sitemap.ts`, and the header and footer links.
  - `ToolShell` is a shared server-rendered page shell; the tool itself loads client-side only.
- **Table generator (phase 3).**
  - A minimal CodeMirror running the real table grid widget, with no workspace code.
  - Size picker and New table; CSV/TSV convert.
  - Live Markdown output with Copy, plus Open in HermesMarkdown.
  - The table key bindings move into a shared `codemirror/table-keymap.ts`.
- **Mermaid editor (phase 4).**
  - Plain `Textarea` source with a 400 ms debounced live render through the existing `renderMermaid`.
  - The viewer (zoom/fit/pan/SVG download) is pulled out of `MermaidDialog` into `MermaidViewer` and reused by both.
  - Examples picker, Copy Markdown, Open in HermesMarkdown.
- **Docs (phase 5).** Component docs, directory READMEs, ARCHITECTURE bullet, and an in-app "Free tools" entry.
- **Analytics:** none new. The existing cookieless page-view script covers the tool pages.

### Already exists
- The table grid widget and its helpers, which work without the workspace (`table-display.tsx`, `table-manipulation.ts`, `tableParser`/`tableSerializer`).
- On-demand Mermaid loading with `securityLevel: "strict"` (`render-mermaid.ts`), and the viewer controls in `MermaidDialog`.
- `useDraftImport` + `DraftImportDialog`.
- The SEO page pattern (`markdown-editor/`, `what-is-hermes-md/`); `robots.ts` already allows everything.
- Production page-view analytics (LiteAnalytics, already disclosed in the privacy policy).

### Found broken
- `useDraftImport` writes imported text into the **active tab** through `atom_content` / `atom_fileName`, and checks that tab for emptiness, not the draft slot.
- With a vault note open, confirming the "overwrite" therefore replaces that note's buffer, and autosave writes it to disk.
- Phase 1 fixes this: imports now always target the draft slot.

### Decisions / open questions to review before handoff
1. **"Mermaid Live Editor" is also the name of the official mermaid.live.** Recommended: keep the slug; the copy says the tool is independent of the Mermaid project.
2. **First-time visitors arriving from a tool skip the welcome wizard on that visit.** It shows on their next editor visit. Recommended: yes.
3. **No conversion tracking.** No `?from=` param and no events. Confirm, or allow a URL param that the existing page-view counter would pick up.
4. **Overwrite prompt in a vault.** Kept as agreed. The alternative is to save the existing draft as its own note first, the way "New note" does, which removes the prompt.
5. **The handed-off Markdown starts with a heading** (`# Markdown table` / `# Mermaid diagram`). Without it, a saved note would be named after a ```` ```mermaid ```` line or the table's header row.
6. **Table tool uses a minimal CodeMirror with the real grid** rather than a lighter React grid: one implementation, the real product experience, and the cost is a chunk that loads only on that page.

### Handoff
"Implement next-client/plans/standalone-tools.md, phase 1" (then phases 2, 3, 4, 5 in order; phase 4 may go before 3).
