import type { ToolEntry } from "./tools";

export const GOOGLE_DOCS_TO_MARKDOWN: ToolEntry = {
  slug: "google-docs-to-markdown",
  name: "Google Docs to Markdown",
  title: "Google Docs to Markdown Converter: Copy, Paste | HermesMarkdown",
  description:
    "Copy a Google Doc, paste it here, and get clean Markdown with headings, lists, links and tables. No Google sign-in and no upload; it runs in your browser.",
  lead: "Select all in Google Docs, paste here, and get Markdown for your README, wiki or notes.",
  keywords: [
    "google docs to markdown",
    "convert google docs to markdown",
    "gdoc to md",
    "google doc to github readme",
    "copy google docs as markdown",
    "docs to markdown online",
  ],
  steps: [
    "In your Google Doc, press Ctrl/Cmd+A, then Ctrl/Cmd+C.",
    "Paste into the box here. The headings, lists, links and tables are converted as you paste.",
    "Copy the Markdown into your repository or wiki, or open it in HermesMarkdown to keep editing.",
  ],
  faq: [
    {
      q: "Do I need to connect my Google account?",
      a: "No. This tool never talks to Google. You copy the text yourself and paste it, so it can only see what you paste.",
    },
    {
      q: "Doesn't Google Docs have its own Markdown export?",
      a: "Google Docs can download a document as Markdown, but that goes through your account and only works one document at a time. Pasting here works for a selection, a single section or a document you can only view, and you see the result straight away.",
    },
    {
      q: "What comes through well, and what doesn't?",
      a: "Title and Heading styles, bold, italic, strikethrough, links, bulleted, numbered and checklist items, and tables convert. Drawings, comments, suggestions, page breaks, headers and footers do not.",
    },
    {
      q: "Why does my text have extra bold marks?",
      a: "Google Docs wraps pasted content in a bold element, which some converters read as bold text. This tool ignores that wrapper, so only text you made bold is bold in the Markdown.",
    },
    {
      q: "Will the result work in a GitHub README?",
      a: "Yes. The output is GitHub-flavored Markdown: fenced code, pipe tables and task lists all render on GitHub, GitLab and most wikis.",
    },
    {
      q: "Is the document stored anywhere?",
      a: "Only in this browser tab. Nothing is uploaded, and the text is cleared when you close the tab.",
    },
  ],
  related: [
    { slug: "word-to-markdown", anchor: "Convert a Word document to Markdown" },
    { slug: "markdown-cleaner", anchor: "Clean up Markdown after converting" },
    { slug: "csv-to-markdown-table", anchor: "Turn a Google Sheets export into a Markdown table" },
  ],
  pitchLink: { anchor: "Keep your Markdown on your own disk instead of a cloud account", href: "/alternatives/stackedit-alternative" },
  features: [
    "Google Docs headings, lists and links to Markdown",
    "Checklists to task lists",
    "Tables to GitHub-flavored Markdown tables",
    "No Google sign-in and no upload",
    "Runs entirely in the browser",
  ],
};
