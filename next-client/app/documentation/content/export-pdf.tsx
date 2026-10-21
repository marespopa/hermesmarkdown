import { Callout, KV, type Subsection } from "../doc-primitives";

// Documentation content: Export as PDF (Editor group, after the workspace items).
export const exportPdfItem: Subsection = {
  id: "export-pdf",
  title: "Export as PDF",
  lead: "Save a clean, printable PDF of any note. It's made on your device; the note never leaves it.",
  keywords: "pdf export print save share archive download offline report page size a4 letter margins header footer page numbers page break preview",
  body: (
    <>
      <p>
        Run <strong>Export as PDF</strong> from the command palette (the button at the top
        of the page, or <code>CTRL/CMD+K</code>). A dialog shows the page setup and a preview of
        the pages. <strong>Save as PDF…</strong> opens your browser&apos;s print dialog;
        choose <strong>Save as PDF</strong> as the destination (on iPhone and iPad, share the
        preview or save it to Files).
      </p>
      <KV
        rows={[
          { label: "Printed", value: "Headings, lists, task boxes, tables, code, callouts (folded ones open), <details> sections (open), Mermaid diagrams, math and vault images" },
          { label: "Left out", value: "Frontmatter, comments and other raw HTML" },
          { label: "Links", value: "Web links stay clickable; wikilinks print as their text" },
          { label: "Look", value: "Always light, whatever your theme, with page breaks that keep rows, code blocks and headings together" },
        ]}
      />
      <p>
        Set the page up in the dialog; your choices are remembered for the next export.
      </p>
      <KV
        rows={[
          { label: "Paper", value: "A4 (the default) or Letter" },
          { label: "Margins", value: "Narrow, Normal (the default) or Wide" },
          { label: "Header and footer", value: <>Text with <code>{"{title}"}</code>, <code>{"{date}"}</code> (the export day), <code>{"{page}"}</code> and <code>{"{pages}"}</code>, e.g. <code>{"{title} | {date}"}</code> or <code>{"{page} / {pages}"}</code>. On its own it&apos;s centred; <code>|</code> splits it into left | right, or left | centre | right. Leave it empty for none.</> },
          { label: "Page breaks", value: <>A line that&apos;s exactly <code>{"<!-- pagebreak -->"}</code> starts a new page. Turn on <strong>New page at each rule</strong> to break at every horizontal rule (<code>---</code>) too.</> },
          { label: "Preview", value: "Follows your choices as you make them. Each page break starts a new sheet; long sections run onto more pages when printed, and faint lines show roughly where" },
        ]}
      />
      <Callout type="note">
        Headers and footers print in Chrome and Edge. Firefox and Safari leave them out; the rest
        of the page is the same.
      </Callout>
      <p>
        The PDF&apos;s title comes from the note&apos;s first heading, or its file name. A note marked
        private can only be exported once you&apos;ve shown it. <code>CTRL/CMD+P</code> still
        opens the command palette.
      </p>
    </>
  ),
};

// Documentation content: Export as HTML (after Export as PDF).
export const exportHtmlItem: Subsection = {
  id: "export-html",
  title: "Export as HTML",
  lead: "Download any note as one standalone web page. It's made on your device; the note never leaves it.",
  keywords: "html export web page website publish share download standalone self-contained file offline",
  body: (
    <>
      <p>
        Run <strong>Export as HTML</strong> from the command palette (the button at the top
        of the page, or <code>CTRL/CMD+K</code>). The note downloads as a single <code>.html</code>{" "}
        file named after it, ready to open in any browser, send, or put on a website.
      </p>
      <KV
        rows={[
          { label: "Included", value: "Everything Export as PDF prints: headings, lists, task boxes, tables, code, callouts, <details> sections (open or closed as in the note), Mermaid diagrams, math, embeds and vault images" },
          { label: "Standalone", value: "Images, diagrams and styles are inside the file, so it opens offline and loads nothing else (images the note links to on the web stay links)" },
          { label: "Look", value: "A centred reading column that follows the reader's light or dark setting, and prints like the PDF" },
        ]}
      />
      <p>
        The page&apos;s title comes from the note&apos;s first heading, or its file name. Like Export
        as PDF, a note marked private can only be exported once you&apos;ve shown it.
      </p>
    </>
  ),
};
