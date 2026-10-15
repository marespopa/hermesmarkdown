// Copy for the home page sections below the hero. The FAQ is also the
// home page's FAQPage structured data (app/page.tsx), so the two never drift.

export type LandingFeature = { title: string; body: string };
export type LandingFaq = { q: string; a: string };

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Your files, on your disk",
    body: "Open a folder of .md files and edit them in place. Nothing is uploaded, and an existing Obsidian vault opens as-is.",
  },
  {
    title: "Works offline",
    body: "Install it as an app from the browser and keep writing without a connection. There is no account to sign in to.",
  },
  {
    title: "Linked notes",
    body: "Connect notes with [[wikilinks]], and embed a note, a heading, an image or a CSV table on its own line with ![[Note]].",
  },
  {
    title: "Tables and drawing boards",
    body: "Edit Markdown tables like a spreadsheet, with sorting and formulas, and sketch on infinite drawing boards stored as Markdown.",
  },
  {
    title: "Focus when you need it",
    body: "Hide the interface and dim everything but the paragraph or sentence you're writing. Vim keys are there if you want them.",
  },
  {
    title: "Export and AI, both optional",
    body: "Export notes as PDF or compiled Markdown. AI features use your own API key and stay off until you add one.",
  },
];

export const LANDING_PLATFORMS: LandingFeature[] = [
  {
    title: "Chrome, Edge and other Chromium browsers",
    body: "Read and write a folder on your disk directly.",
  },
  {
    title: "Safari, Firefox, iPhone, iPad and Android",
    body: "Keep notes in a browser vault stored on the device.",
  },
  {
    title: "Any modern browser",
    body: "Optionally keep a vault in a GitHub repository you control, with explicit commits.",
  },
];

export const LANDING_FAQ: LandingFaq[] = [
  {
    q: "Is HermesMarkdown free?",
    a: "Yes. HermesMarkdown is free to use in any modern browser, with no account and no subscription.",
  },
  {
    q: "Where are my notes stored?",
    a: "In a vault you choose: a folder of Markdown files on your disk, a browser vault kept in your browser's own storage, or a GitHub repository you control. Notes are never uploaded to a HermesMarkdown server.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. Install it as an app from your browser and it keeps working without a connection. Only GitHub sync and the optional AI features need the network.",
  },
  {
    q: "Does it work on Safari, Firefox, iPhone and iPad?",
    a: "Yes. Where the browser can't open a folder on disk, as in Safari, Firefox and mobile browsers, notes are kept in a browser vault on the device.",
  },
  {
    q: "Can I use it with my Obsidian vault?",
    a: "Yes. An Obsidian vault is a folder of Markdown files, so you can open it directly in Chrome or Edge. Files stay plain Markdown and wikilinks keep working.",
  },
];
