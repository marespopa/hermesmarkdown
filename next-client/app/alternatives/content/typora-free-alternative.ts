import type { AlternativeEntry } from "./types";

export const TYPORA_FREE_ALTERNATIVE: AlternativeEntry = {
  slug: "typora-free-alternative",
  competitor: "Typora",
  title: "A Free Typora Alternative in Your Browser | HermesMarkdown",
  description:
    "Looking for a free Typora alternative? HermesMarkdown renders Markdown as you type, edits plain .md files on your disk, and runs in the browser with no install.",
  lead: "A Markdown editor that shows your formatting as you write, with nothing to buy, install or sign in to.",
  keywords: [
    "typora alternative",
    "free typora alternative",
    "typora alternative browser",
    "typora online",
    "wysiwyg markdown editor free",
    "markdown editor like typora",
  ],
  whySwitch: [
    {
      title: "Nothing to install",
      body: "HermesMarkdown is a web app. Open it in a browser and write; install it as an app from the address bar only if you want its own window.",
    },
    {
      title: "Free, with no account",
      body: "There is no sign-up and no sync service to set up. Your notes stay on your device.",
    },
    {
      title: "Your files stay plain Markdown",
      body: "In Chrome and Edge it reads and writes .md files in a folder you choose, so any other editor can open the same files.",
    },
    {
      title: "Works on devices a desktop app doesn't",
      body: "Safari, Firefox, iPad and Android phones keep notes in a browser vault, so the same editor follows you onto a tablet.",
    },
  ],
  comparison: [
    { feature: "How you get it", hermes: "Open it in your browser; optional install as an app", them: "A desktop app you download and install" },
    { feature: "Cost", hermes: "Free to use", them: "A paid desktop application" },
    { feature: "Files", hermes: "Plain .md files in a folder (Chrome, Edge) or a browser vault (Safari, Firefox, mobile)", them: "Plain .md files on your computer" },
    { feature: "Writing view", hermes: "One view: Markdown marks appear on the line you are editing", them: "One view that renders as you type" },
    { feature: "Works offline", hermes: "Yes, once loaded; AI features need a connection", them: "Yes, it is a desktop app" },
    { feature: "Phones and tablets", hermes: "Yes, through the browser or an installed web app", them: "A desktop app" },
  ],
  faq: [
    {
      q: "Is HermesMarkdown really free?",
      a: "Yes. There is no account and no paywall. Optional AI features use your own API key from the provider you pick, which that provider may charge for.",
    },
    {
      q: "Does it edit one view like Typora does?",
      a: "Yes, in spirit. You write in a single view, and headings, bold, links and lists look formatted. The Markdown marks show only on the line your caret is on, so you can still see and edit the source.",
    },
    {
      q: "Can I open my existing Typora files?",
      a: "Typora files are plain Markdown, so yes. In Chrome or Edge, open the folder that holds them. In Safari or Firefox, import them into a browser vault. Nothing is converted or locked in.",
    },
    {
      q: "Where are my notes stored?",
      a: "On your device. In Chrome and Edge that is the folder you pick; in Safari, Firefox and on phones it is a vault in the browser's own storage, which you can export as a zip for a backup.",
    },
    {
      q: "Can I export to PDF?",
      a: "Yes. Export as PDF opens your browser's print dialog with a page setup (paper size, margins, header and footer), and Save as PDF writes the file on your device.",
    },
    {
      q: "Does it work offline?",
      a: "Yes. After the first load it starts without a connection, and everything except the AI features keeps working.",
    },
  ],
  related: [
    { label: "Markdown to PDF", href: "/tools/markdown-to-pdf" },
    { label: "Markdown Table Generator", href: "/tools/markdown-table-generator" },
    { label: "Installing HermesMarkdown", href: "/documentation/installation" },
    { label: "Export as PDF", href: "/documentation/export-pdf" },
    { label: "Work offline on a Chromebook", href: "/guides/offline-markdown-editor-chromebook" },
  ],
};
