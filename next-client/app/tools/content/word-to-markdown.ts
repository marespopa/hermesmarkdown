import type { ToolEntry } from "./tools";

export const WORD_TO_MARKDOWN: ToolEntry = {
  slug: "word-to-markdown",
  name: "Word to Markdown",
  title: "Word to Markdown Converter: Paste a .docx Text | HermesMarkdown",
  description:
    "Copy text from a Word document, paste it here, and get Markdown with its headings, lists, links and tables kept. Free, and nothing leaves your browser.",
  lead: "Copy from Microsoft Word, paste, and take the Markdown.",
  keywords: [
    "word to markdown",
    "docx to markdown",
    "convert word to markdown",
    "microsoft word to markdown",
    "word document to md",
    "paste from word to markdown",
  ],
  steps: [
    "In Word, select the text you want (Ctrl/Cmd+A for the whole document) and copy it.",
    "Click into the box and paste. Heading styles, lists, links and tables arrive as Markdown.",
    "Copy the Markdown, or open it in HermesMarkdown to tidy it and save a .md file.",
  ],
  faq: [
    {
      q: "Can I upload a .docx file?",
      a: "No upload is needed, and none happens. Open the document in Word (or Pages, or LibreOffice), copy the part you want and paste it here. The paste carries Word's formatting, which is what gets converted.",
    },
    {
      q: "Which Word formatting turns into Markdown?",
      a: "Heading styles become # headings, bold and italic stay bold and italic, bulleted and numbered lists keep their nesting, links stay links and tables become Markdown tables. Fonts, colors, text boxes and page layout have no Markdown form and are dropped.",
    },
    {
      q: "Why are my headings plain text after pasting?",
      a: "Word only marks a line as a heading when it uses a Heading style. A line that is merely made big and bold pastes as a bold paragraph. Apply Heading 1, 2 or 3 in Word first, or add the # marks afterwards in the editor.",
    },
    {
      q: "What happens to images and comments?",
      a: "Images are not carried over, since Markdown links to files rather than embedding them. Comments and tracked changes are left out; accept or reject the changes in Word before you copy if you want the final text.",
    },
    {
      q: "Is my document sent anywhere?",
      a: "No. The conversion runs in your browser tab and the text is not uploaded. It is kept only in this tab's session storage, so closing the tab clears it.",
    },
    {
      q: "Does it work for Pages or LibreOffice too?",
      a: "Yes. Any word processor that puts formatted text on the clipboard works the same way: copy, paste, and the formatting converts.",
    },
  ],
  related: [
    { slug: "google-docs-to-markdown", anchor: "Convert a Google Doc to Markdown" },
    { slug: "markdown-cleaner", anchor: "Clean up Markdown after converting" },
    { slug: "markdown-to-pdf", anchor: "Turn the Markdown back into a PDF" },
  ],
  pitchLink: { anchor: "Write Markdown with live formatting in a free browser editor", href: "/alternatives/typora-free-alternative" },
  features: [
    "Word heading styles to # headings",
    "Lists, links, bold and italic kept",
    "Word tables to Markdown tables",
    "Drops fonts, colors and page layout",
    "Runs entirely in the browser",
  ],
};
