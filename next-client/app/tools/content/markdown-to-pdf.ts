import type { ToolEntry } from "./tools";

export const MARKDOWN_TO_PDF: ToolEntry = {
  slug: "markdown-to-pdf",
  name: "Markdown to PDF",
  title: "Markdown to PDF Converter: Preview and Print | HermesMarkdown",
  description:
    "Paste Markdown, preview it as a formatted page, and save it as a PDF through your browser's print dialog. No upload, no account, and it works offline.",
  lead: "Paste Markdown, see the page it makes, and save it as a PDF.",
  keywords: [
    "markdown to pdf",
    "convert markdown to pdf",
    "md to pdf online",
    "markdown pdf converter",
    "export markdown as pdf",
    "markdown print preview",
  ],
  steps: [
    "Paste your Markdown, or start from the sample.",
    "Check the preview: headings, lists, tables, code, diagrams and formulas are laid out as printed pages.",
    "Press Save as PDF and choose \"Save as PDF\" as the destination in the print dialog.",
  ],
  faq: [
    {
      q: "How does it make the PDF?",
      a: "It lays the page out the way a printed document looks and hands it to your browser's print dialog, where \"Save as PDF\" writes the file. The PDF is created on your device, not by a server.",
    },
    {
      q: "Are tables, code blocks and diagrams supported?",
      a: "Yes. Tables, fenced code, task lists, callouts, Mermaid diagrams and math formulas are rendered. Page breaks avoid splitting a table row, a code block or a diagram across two pages.",
    },
    {
      q: "Why is the page always light?",
      a: "The printout uses a fixed light page with dark text, whatever your theme is, so the PDF reads well on paper and on any screen.",
    },
    {
      q: "Can I add a header, footer or page numbers?",
      a: "Those and the page size are page setup in the HermesMarkdown editor's Export as PDF dialog. Open your Markdown there to set them. This page prints with a standard A4 layout.",
    },
    {
      q: "Do images work?",
      a: "Images that link to a web address or are embedded as data show up. Files on your disk cannot be read from a web page, so open the note in the editor with its vault to print those.",
    },
    {
      q: "Is my Markdown uploaded?",
      a: "No. The preview and the PDF are made in your browser. The text is kept in this tab's session storage until you close the tab.",
    },
  ],
  features: [
    "Live preview of the printed page",
    "Tables, code, task lists and callouts",
    "Mermaid diagrams and math",
    "Saves a PDF through the browser's print dialog",
    "No upload; works offline",
  ],
};
