import Link from "next/link";
import type { ReactNode } from "react";
import { TOOLS, toolPath, type ToolEntry } from "../content/tools";
import { serializeJsonLd, toolJsonLd } from "./tool-json-ld";

interface Props {
  tool: ToolEntry;
  // The tool's own "Open in HermesMarkdown" button, for the pitch block.
  openInWorkspace: ReactNode;
  // The interactive tool (client-only).
  children: ReactNode;
}

const SECTION = "space-y-6 border-t border-edge-subtle pt-14";
const H2 = "text-2xl md:text-3xl font-bold tracking-tight";
const MUTED = "text-fg-muted leading-relaxed";

// The page around a tool: breadcrumb, title, the tool, then how it works,
// the privacy line, the workspace pitch, the FAQ and links to the other
// tools. Everything but the tool is server-rendered, and the FAQ text is the
// same as the FAQPage structured data.
export default function ToolShell({ tool, openInWorkspace, children }: Props) {
  const others = TOOLS.filter((entry) => entry.slug !== tool.slug);

  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      {toolJsonLd(tool).map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-28 space-y-14">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="text-ui-footnote text-fg-muted">
            <ol className="flex items-center gap-2">
              <li><Link href="/tools" className="hover:text-sage transition-colors">Tools</Link></li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="text-fg">{tool.name}</li>
            </ol>
          </nav>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">{tool.name}</h1>
          <p className={`text-lg md:text-xl max-w-2xl ${MUTED}`}>{tool.lead}</p>
        </header>

        <section aria-label={tool.name}>{children}</section>

        <section className={SECTION}>
          <h2 className={H2}>How it works</h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {tool.steps.map((step, index) => (
              <li key={step} className="space-y-2">
                <span className="text-ui-footnote font-bold text-sage">{index + 1}</span>
                <p className={MUTED}>{step}</p>
              </li>
            ))}
          </ol>
          <p className="text-ui-subhead text-fg-muted">Runs in your browser. Nothing is uploaded.</p>
        </section>

        <section className={`${SECTION} space-y-5`}>
          <h2 className={H2}>Keep writing in HermesMarkdown</h2>
          <p className={`max-w-2xl ${MUTED}`}>
            A local-first Markdown editor that runs in your browser: notes stay on your device, with
            tables, diagrams and AI when you want it. No account needed.
          </p>
          {openInWorkspace}
        </section>

        <section className={SECTION}>
          <h2 className={H2}>FAQ</h2>
          <div className="space-y-8">
            {tool.faq.map(({ q, a }) => (
              <div key={q} className="space-y-2">
                <h3 className="font-bold text-lg">{q}</h3>
                <p className={MUTED}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        {others.length > 0 && (
          <section className={SECTION}>
            <h2 className={H2}>More free tools</h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {others.map((entry) => (
                <li key={entry.slug}>
                  <Link href={toolPath(entry)} className="font-semibold hover:text-sage transition-colors">{entry.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
