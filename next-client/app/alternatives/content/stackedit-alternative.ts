import type { AlternativeEntry } from "./types";

export const STACKEDIT_ALTERNATIVE: AlternativeEntry = {
  slug: "stackedit-alternative",
  competitor: "StackEdit",
  title: "A Local-First StackEdit Alternative | HermesMarkdown",
  description:
    "StackEdit is an in-browser Markdown editor with cloud sync. HermesMarkdown also runs in the browser but keeps files on your disk, with no account and no sync service.",
  lead: "An in-browser Markdown editor that saves to your own folder and never asks you to connect a cloud account.",
  keywords: [
    "stackedit alternative",
    "stackedit offline",
    "in-browser markdown editor",
    "local first markdown editor",
    "markdown editor no cloud sync",
    "stackedit.io alternative",
  ],
  whySwitch: [
    {
      title: "Real files on your disk",
      body: "In Chrome and Edge, HermesMarkdown reads and writes .md files in a folder you pick, so other tools see your notes straight away.",
    },
    {
      title: "No sync to set up",
      body: "There is no account to link and no sync to configure. What you write is where you saved it.",
    },
    {
      title: "Built for a library of notes",
      body: "Folders, a sidebar, search, tags, tasks and WikiLinks between notes sit in one calm editor.",
    },
    {
      title: "Quick tools alongside",
      body: "Free pages for tables, diagrams, cleaning pasted text and counting tokens run in the same browser, with nothing uploaded.",
    },
  ],
  comparison: [
    { feature: "Where it runs", hermes: "In the browser; optional install as an app", them: "In the browser" },
    { feature: "Storage", hermes: "A folder on your disk (Chrome, Edge) or a browser vault", them: "Browser storage, with optional cloud sync" },
    { feature: "Sync", hermes: "No sync service", them: "Can synchronize with cloud storage services" },
    { feature: "Organizing notes", hermes: "Folders, tags, tasks, WikiLinks, command palette", them: "Documents in a workspace" },
  ],
  faq: [
    {
      q: "Why choose local files over cloud sync?",
      a: "Local files are yours: no service can lock them, and any editor can open them. If you do want them synced, use the sync tool you already trust on the folder.",
    },
    {
      q: "Can I move my StackEdit documents over?",
      a: "Yes. Export them as .md files and open the folder, or import the files into a browser vault. They are plain Markdown either way.",
    },
    {
      q: "Does it need an internet connection?",
      a: "Only to load the first time. After that it starts offline, and everything except the AI features keeps working.",
    },
    {
      q: "Does it have a live preview pane?",
      a: "It uses a single writing view in which formatting is shown as you type, rather than a split source and preview. Export as PDF or HTML shows the rendered page.",
    },
    {
      q: "Can I use it on a tablet?",
      a: "Yes. On iPad and iPhone it keeps notes in a browser vault, and installing it to the home screen lets it start without a connection.",
    },
    {
      q: "Is it free?",
      a: "Yes, with no account. Optional AI features use your own key with the provider you choose.",
    },
  ],
  related: [
    { label: "Browser vaults", href: "/documentation/browser-vaults" },
    { label: "Vaults on phones and tablets", href: "/documentation/vaults-on-mobile" },
    { label: "Mermaid in Markdown", href: "/tools/mermaid-in-markdown" },
    { label: "Markdown Cleaner", href: "/tools/markdown-cleaner" },
    { label: "Offline Markdown editor on a Chromebook", href: "/guides/offline-markdown-editor-chromebook" },
  ],
};
