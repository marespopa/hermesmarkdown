# Tools

Free, single-purpose tool pages under `/tools/*`, each useful on its own and ending with **Open in HermesMarkdown**, which carries the result into the editor's draft. Everything runs in the browser; nothing is uploaded. Spec: `plans/standalone-tools.md`.

| Path | Role |
|---|---|
| `page.tsx` | `/tools` hub: one `ToolCard` per catalog entry, BreadcrumbList JSON-LD |
| `content/tools.ts` | The catalog (`TOOLS`, `toolBySlug`, `toolPath`, `toolMetadata`): the single source for the hub, pages, metadata, sitemap and footer. A tool is listed only once its page exists |
| `content/tokenizer.ts`, `content/markdown-table-generator.ts` | Each tool's copy: title, description, lead, steps, FAQ, features |
| `components/ToolShell.tsx` | The page around a tool (server) |
| `components/OpenInWorkspaceButton.tsx` | The handoff button (client) |
| `components/ToolCard.tsx` | A hub card |
| `components/tool-json-ld.ts` | `toolJsonLd` (WebApplication, FAQPage, BreadcrumbList), `breadcrumbJsonLd`, `serializeJsonLd` (escapes `<`) |
| `utils/tool-markdown.ts` | What each tool hands over: `tableHandoffMarkdown` / `mermaidHandoffMarkdown` (an H1 title, so the saved note is named after it), `mermaidFence` |
| `table/` + `markdown-table-generator/page.tsx` | `/tools/markdown-table-generator`: `TableToolLoader` (client-only, skeleton), `TableTool`, `TableGridEditor` (a CodeMirror view with only the editor's table grid, `table-tool-extensions.ts`), `TableCsvImport`, `TableOpenButton`, `default-table.ts`, `table-output.ts` (`tableOutput`: aligns table-only blocks and, with "results", swaps formula cells for their values; `hasFormulas`). The formula engine stays in this folder so other tool pages don't load it |
| `tokenizer/` | `/tools/tokenizer`: `page.tsx`, `TokenizerToolLoader` (client-only, skeleton), `TokenizerTool`, `TokenView`, `TokenizerOpenButton`, `use-tokenizer.ts` (worker client), `segment-tokens.ts` (pure), `tokenizer-examples.ts` |

## Handoff and tracking
`OpenInWorkspaceButton` writes the payload with `app/utils/tool-handoff.ts` (sessionStorage, same tab) and opens `toolEditorUrl(source)`, `/editor?from=<source>`. The `from` parameter only lets the cookieless page-view counter show tool → editor arrivals; the editor ignores it. `useToolHandoff` (editor) offers the payload to the draft.

## Bundle boundary
Tool code imports `@/app/atoms/tool-atoms` and shared UI components only: never the `atoms.ts` barrel, the file system hooks or `app/editor/page.tsx`, so tool pages don't ship the workspace. The table generator loads CodeMirror (core and `lang-markdown`, no code-language data) only on its own route. The tokenizer's vocabularies (`gpt-tokenizer`, 1–2.5 MB each) load only inside `app/workers/tokenizer.worker.ts`, on first use.
