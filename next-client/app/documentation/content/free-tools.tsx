import { TOOLS, toolPath } from "@/app/tools/content/tools";
import { Callout, KV, type Subsection } from "../doc-primitives";

// Documentation content: Get started group, the free tool pages (/tools).
export const freeToolsItems: Subsection[] = [
  {
    id: "free-tools",
    title: "Free tools",
    lead: "Small, single-purpose tools that run in your browser without a vault or an account, and hand their result to the editor.",
    keywords: "free tools markdown table generator mermaid in markdown diagram tokenizer token counter gpt markdown cleaner html to markdown converter google docs word lint format open in hermesmarkdown handoff draft csv spreadsheet formulas svg",
    body: (
      <>
        <p>
          The <a href="/tools" className="text-accent hover:underline">tools page</a> lists them.
          Each one is useful on its own: copy the result, or download it.
        </p>
        <KV
          rows={TOOLS.map((tool) => ({
            label: (
              <a href={toolPath(tool)} className="text-accent hover:underline">
                {tool.name}
              </a>
            ),
            value: tool.lead,
          }))}
        />
        <p>
          <strong>Open in HermesMarkdown</strong> carries the result into the editor as your
          draft: a table with its formulas still calculating, a diagram rendered inline, the cleaned
          Markdown, or the text you tokenized. If the draft already has text, the editor asks before replacing it; cancel
          and your draft stays as it was, with the tool&apos;s work still on its page (press Back).
          The draft then saves like any other: into your vault once it has a first line or, with no
          vault open, as a download when you save.
        </p>
        <p>
          The work on a tool page is kept in that browser tab only, so a refresh doesn&apos;t lose
          it and a new tab starts fresh. Open in HermesMarkdown stays in the same tab for the same
          reason.
        </p>
        <Callout type="note">
          Nothing from the tools is uploaded. Tables, diagrams, conversions and token counts are all
          computed in your browser.
        </Callout>
      </>
    ),
  },
];
