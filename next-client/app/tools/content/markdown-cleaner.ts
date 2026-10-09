import type { ToolEntry } from "./tools";

export const MARKDOWN_CLEANER: ToolEntry = {
  slug: "markdown-cleaner",
  name: "Markdown Cleaner",
  title: "Markdown Cleaner: HTML to Markdown Converter | HermesMarkdown",
  description:
    "Paste messy Markdown, HTML, rich text from Google Docs or Word, or CSV, and get clean GitHub-flavored Markdown: fixed lists, headings and tables. Free and private.",
  lead: "Paste anything with text in it and get clean, standard Markdown back.",
  keywords: [
    "markdown cleaner",
    "markdown formatter",
    "markdown linter online",
    "html to markdown",
    "html to markdown converter",
    "google docs to markdown",
    "word to markdown",
    "rich text to markdown",
    "csv to markdown",
    "fix markdown list indentation",
  ],
  steps: [
    "Paste Markdown, HTML, a web page selection, Google Docs or Word text, or CSV. The format is detected for you.",
    "Read the clean Markdown on the right, with a list of every fix: list indents, headings, tables, stray styling.",
    "Copy it, or open it in HermesMarkdown to keep writing.",
  ],
  faq: [
    {
      q: "What does the cleaner fix?",
      a: "It nests lists by their indentation and uses - for bullets, turns underlined and #-without-space headings into standard # headings, aligns tables, collapses extra blank lines, removes trailing spaces, invisible characters and leftover styling tags, and closes unfinished code blocks. Code blocks, inline code and front matter are never changed.",
    },
    {
      q: "How do I convert Google Docs or Word to Markdown?",
      a: "Copy from the document and paste here. The formatting comes along as HTML, so headings, bold and italic text, links, lists and tables become Markdown. To paste only the plain text, use your browser's paste-as-plain-text shortcut.",
    },
    {
      q: "Can it convert HTML to Markdown?",
      a: "Yes. Paste HTML source or copy part of a web page, and it becomes GitHub-flavored Markdown with tables, strikethrough, task lists and fenced code. Scripts, styles and inline styling are dropped.",
    },
    {
      q: "Is my text uploaded?",
      a: "No. Converting and cleaning happen in your browser and nothing is sent to a server. Your input is kept only in this browser tab, so a refresh doesn't lose it.",
    },
    {
      q: "Can I keep editing it later?",
      a: "Yes. Open in HermesMarkdown carries the clean Markdown into the editor as a draft, which you can save as a Markdown file on your device.",
    },
  ],
  features: [
    "HTML, rich text, Google Docs and Word to Markdown",
    "CSV and TSV to Markdown tables",
    "Fixes list indentation, headings, tables and blank lines",
    "Strips inline styling and invisible characters",
    "Report of every fix",
    "Runs entirely in the browser",
  ],
};
