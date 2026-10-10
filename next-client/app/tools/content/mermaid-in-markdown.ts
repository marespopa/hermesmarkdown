import type { ToolEntry } from "./tools";

export const MERMAID_IN_MARKDOWN: ToolEntry = {
  slug: "mermaid-in-markdown",
  name: "Mermaid in Markdown",
  title: "Mermaid in Markdown: Live Diagram Editor & SVG Export | HermesMarkdown",
  description:
    "Write Mermaid flowcharts, sequence diagrams and Gantt charts with a live preview, then copy them as a Markdown code block or download the SVG. Free and private.",
  lead: "Write a diagram as text, watch it draw itself, and drop it into any Markdown file.",
  keywords: [
    "mermaid markdown",
    "mermaid in markdown",
    "mermaid editor online",
    "mermaid live preview",
    "mermaid to svg",
    "mermaid flowchart",
    "markdown diagram",
  ],
  steps: [
    "Type Mermaid on the left, or start from an example: flowchart, sequence, Gantt and more.",
    "The diagram redraws as you type; zoom, pan, or download it as SVG.",
    "Copy it as a ```mermaid code block, or open it in HermesMarkdown to keep writing around it.",
  ],
  faq: [
    {
      q: "How do I put a Mermaid diagram in Markdown?",
      a: "Wrap the diagram in a fenced code block whose language is mermaid: three backticks and the word mermaid, the diagram, then three backticks. Copy Markdown gives you exactly that block. GitHub, GitLab, Obsidian, Notion and HermesMarkdown draw it as a diagram.",
    },
    {
      q: "Which diagram types are supported?",
      a: "Everything Mermaid supports, including flowcharts, sequence, class, state, entity-relationship, Gantt, pie and mind map diagrams. Pick one from the examples to start from working syntax.",
    },
    {
      q: "Is this the official Mermaid editor?",
      a: "No. Mermaid in Markdown is an independent tool from HermesMarkdown, built on the open-source Mermaid library. It focuses on getting a diagram into a Markdown file.",
    },
    {
      q: "Is my diagram uploaded?",
      a: "No. Diagrams are drawn in your browser and never sent to a server. The source is kept only in this browser tab, so a refresh doesn't lose it.",
    },
    {
      q: "Can I keep editing it later?",
      a: "Yes. Open in HermesMarkdown carries the diagram into the editor as a draft, where it renders inline in your note and you can save it as a Markdown file on your device.",
    },
  ],
  features: [
    "Live Mermaid preview as you type",
    "Zoom, pan and SVG download",
    "Examples for flowchart, sequence, class, state, ER, Gantt, pie and mind map diagrams",
    "Copy as a Markdown code block",
    "Runs entirely in the browser",
  ],
};
