import type { AlternativeEntry } from "./types";

export const DILLINGER_ALTERNATIVE: AlternativeEntry = {
  slug: "dillinger-alternative",
  competitor: "Dillinger",
  title: "A Private Dillinger Alternative, Offline | HermesMarkdown",
  description:
    "Dillinger is an online Markdown editor with cloud connections. HermesMarkdown is a browser editor that keeps notes on your device, works offline and needs no account.",
  lead: "A browser Markdown editor that writes to your own disk instead of connecting to cloud accounts.",
  keywords: [
    "dillinger alternative",
    "dillinger markdown alternative",
    "online markdown editor offline",
    "private online markdown editor",
    "markdown editor without cloud",
    "dillinger.io alternative",
  ],
  whySwitch: [
    {
      title: "Notes stay on your device",
      body: "HermesMarkdown does not need a cloud account to save. Files go to a folder you choose, or to a vault in the browser.",
    },
    {
      title: "Works offline",
      body: "Once loaded, it starts without a connection. Everything except the optional AI features keeps working.",
    },
    {
      title: "A library of notes",
      body: "A vault holds many files and folders, with a sidebar, search, tags, tasks and WikiLinks between notes.",
    },
    {
      title: "Still just a browser tab",
      body: "Like Dillinger, there is nothing to install. Open the page and start typing.",
    },
  ],
  comparison: [
    { feature: "Where it runs", hermes: "In the browser; optional install as an app", them: "In the browser" },
    { feature: "Storage", hermes: "A folder on your disk (Chrome, Edge) or a browser vault", them: "Browser storage, with cloud service connections" },
    { feature: "Install", hermes: "Nothing to install; optional install as an app", them: "Nothing to install" },
    { feature: "Cloud connections", hermes: "None built in; no sync service", them: "Connects to cloud storage and code hosting services" },
  ],
  faq: [
    {
      q: "Is HermesMarkdown a drop-in replacement for Dillinger?",
      a: "For writing and exporting Markdown, yes. It differs in that it is built around a library of files kept on your device, not around cloud connections.",
    },
    {
      q: "Does anything get uploaded?",
      a: "No. Your notes are not sent to a server. Only the optional, bring-your-own-key AI features contact a service, and only when you use them.",
    },
    {
      q: "Can I export HTML or PDF?",
      a: "Yes. Export as HTML writes a standalone file, and Export as PDF goes through your browser's print dialog. Both are made on your device.",
    },
    {
      q: "What about GitHub or Google Drive?",
      a: "There is no built-in connection to them. Point a folder at a location your own tools already sync, or commit the folder with git yourself; HermesMarkdown doesn't run or read git.",
    },
    {
      q: "Does it work in Safari and Firefox?",
      a: "Yes. Those browsers can't open folders, so they keep notes in a browser vault, which you can export as a zip for a backup.",
    },
    {
      q: "Do I need to create an account?",
      a: "No. There is nothing to sign up for.",
    },
  ],
  related: [
    { label: "HTML and PDF export", href: "/documentation/export-html" },
    { label: "Browser vaults", href: "/documentation/browser-vaults" },
    { label: "Using git", href: "/documentation/git" },
    { label: "Markdown to PDF", href: "/tools/markdown-to-pdf" },
    { label: "Work offline on a Chromebook", href: "/guides/offline-markdown-editor-chromebook" },
  ],
};
