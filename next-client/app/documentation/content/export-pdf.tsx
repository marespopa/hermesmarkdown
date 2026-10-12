import { KV, type Subsection } from "../doc-primitives";

// Documentation content: Export as PDF (Editor group, after the workspace items).
export const exportPdfItem: Subsection = {
  id: "export-pdf",
  title: "Export as PDF",
  lead: "Save a clean, printable PDF of any note. It's made on your device; the note never leaves it.",
  keywords: "pdf export print save share archive download offline report",
  body: (
    <>
      <p>
        Run <strong>Export as PDF…</strong> from the command palette, or choose it from the
        toolbar&apos;s <strong>More</strong> menu. Your browser&apos;s print dialog opens with the
        note laid out for paper; choose <strong>Save as PDF</strong> as the destination (on iPhone
        and iPad, share the preview or save it to Files).
      </p>
      <KV
        rows={[
          { label: "Printed", value: "Headings, lists, task boxes, tables, code, callouts (folded ones open), Mermaid diagrams, math and vault images" },
          { label: "Left out", value: "Frontmatter, raw HTML and comments" },
          { label: "Links", value: "Web links stay clickable; wikilinks print as their text" },
          { label: "Look", value: "Always light, whatever your theme, with page breaks that keep rows, code blocks and headings together" },
        ]}
      />
      <p>
        The PDF&apos;s title comes from the note&apos;s first heading, or its file name. A note marked
        sensitive can only be exported once you&apos;ve shown it. <code>CTRL/CMD+P</code> still
        opens the command palette.
      </p>
    </>
  ),
};
