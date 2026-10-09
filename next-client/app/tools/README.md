# Tools

Free, single-purpose tool pages under `/tools/*`, each useful on its own and ending with **Open in HermesMarkdown**, which carries the result into the editor's draft. Everything runs in the browser; nothing is uploaded. Spec: `plans/standalone-tools.md`.

| Path | Role |
|---|---|
| `page.tsx` | `/tools` hub: one `ToolCard` per catalog entry, BreadcrumbList JSON-LD |
| `content/tools.ts` | The catalog (`TOOLS`, `toolBySlug`, `toolPath`, `toolMetadata`): the single source for the hub, pages, metadata, sitemap and footer. A tool is listed only once its page exists |
| `content/tokenizer.ts` | The tokenizer's copy: title, description, lead, steps, FAQ, features |
| `components/ToolShell.tsx` | The page around a tool (server) |
| `components/OpenInWorkspaceButton.tsx` | The handoff button (client) |
| `components/ToolCard.tsx` | A hub card |
| `components/tool-json-ld.ts` | `toolJsonLd` (WebApplication, FAQPage, BreadcrumbList), `breadcrumbJsonLd`, `serializeJsonLd` (escapes `<`) |
| `tokenizer/` | `/tools/tokenizer`: `page.tsx`, `TokenizerToolLoader` (client-only, skeleton), `TokenizerTool`, `TokenView`, `TokenizerOpenButton`, `use-tokenizer.ts` (worker client), `segment-tokens.ts` (pure), `tokenizer-examples.ts` |

## Handoff and tracking
`OpenInWorkspaceButton` writes the payload with `app/utils/tool-handoff.ts` (sessionStorage, same tab) and opens `toolEditorUrl(source)`, `/editor?from=<source>`. The `from` parameter only lets the cookieless page-view counter show tool → editor arrivals; the editor ignores it. `useToolHandoff` (editor) offers the payload to the draft.

## Bundle boundary
Tool code imports `@/app/atoms/tool-atoms` and shared UI components only: never the `atoms.ts` barrel, the file system hooks or `app/editor/page.tsx`, so tool pages don't ship the workspace. The tokenizer's vocabularies (`gpt-tokenizer`, 1–2.5 MB each) load only inside `app/workers/tokenizer.worker.ts`, on first use.
