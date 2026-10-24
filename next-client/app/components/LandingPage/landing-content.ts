// Copy for the home page sections below the hero. The FAQ is also the
// home page's FAQPage structured data (app/page.tsx), so the two never drift.

export type LandingFeature = { title: string; body: string };
export type LandingFaq = { q: string; a: string };

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Your files, on your disk",
    body: "Open a folder and edit its files in place, offline too. Nothing is uploaded, there is no account, and an existing Obsidian vault opens as-is.",
  },
  {
    title: "Notes that connect",
    body: "Link notes with [[wikilinks]], embed a note, a heading, an image or a CSV table with ![[Note]], edit tables like a spreadsheet with formulas, and sketch on drawing boards stored as Markdown.",
  },
  {
    title: "Code files, too",
    body: "TypeScript, Python, JSON, YAML and other text files open in the same editor, with highlighting, line numbers, folding, an outline of their functions and classes, and Format Code with your Prettier config.",
  },
  {
    title: "Search everything",
    body: "Find any file by name, or search the text of notes and code across the vault, with a regular expression when you need one.",
  },
  {
    title: "Make it yours",
    body: "Pick from three light and three dark color themes, from paper and blue ink to plain neutral white and graphite. Hide the interface and dim everything but the sentence you're writing, or turn on Vim keys.",
  },
  {
    title: "Export and AI, both optional",
    body: "Export notes as PDF, a standalone HTML page or compiled Markdown. AI features use your own API key and stay off until you add one.",
  },
];

export const LANDING_PLATFORMS: LandingFeature[] = [
  {
    title: "Chrome, Edge and other Chromium browsers",
    body: "Read and write a folder on your disk directly.",
  },
  {
    title: "Safari, Firefox, iPhone, iPad and Android",
    body: "Keep files in a browser vault stored on the device.",
  },
  {
    title: "Alongside git",
    body: "A disk vault is a plain folder, so keep it in a git repository and commit with the tools you already use.",
  },
];

export const LANDING_FAQ: LandingFaq[] = [
  {
    q: "Is HermesMarkdown free?",
    a: "Yes. HermesMarkdown is free to use in any modern browser, with no account and no subscription.",
  },
  {
    q: "Where are my files stored?",
    a: "In a vault you choose: a folder of Markdown files on your disk or a browser vault kept in your browser's own storage. Files are never uploaded to a HermesMarkdown server.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. Install it as an app from your browser and it keeps working without a connection. Only the optional AI features need the network.",
  },
  {
    q: "Does it work on Safari, Firefox, iPhone and iPad?",
    a: "Yes. Where the browser can't open a folder on disk, as in Safari, Firefox and mobile browsers, files are kept in a browser vault on the device.",
  },
  {
    q: "Can I edit code files with it?",
    a: "Yes. Code and other text files in the vault open in the same editor, highlighted for their language, with an outline of their symbols, regex search across files and Prettier formatting. Git stays outside the browser: commit with the tools you already use.",
  },
  {
    q: "Can I use it with my Obsidian vault?",
    a: "Yes. An Obsidian vault is a folder of Markdown files, so you can open it directly in Chrome or Edge. Files stay plain Markdown and wikilinks keep working.",
  },
];
