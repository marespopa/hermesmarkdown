// Copy for the home page, section by section. The FAQ is also the
// home page's FAQPage structured data (app/page.tsx), so the two never drift.
// The specs table states the facts and trade-offs once; the FAQ answers the
// questions around them.

export type LandingFaq = { q: string; a: string };
export type LandingSpec = { label: string; value: string };

export type LandingDemo = "palette" | "table" | "render" | "focus" | "files";
/** One chapter: an eyebrow, a headline and a sentence on one side, its live demo on the other. */
export type LandingFeature = { id: string; eyebrow: string; title: string; body: string; demo: LandingDemo };

/** The hero's headline, said again at the close of the page. */
export const LANDING_HEADLINE = "Markdown, without the markup.";
export const LANDING_SUBLINE = "A minimal Markdown editor in your browser. Marks show only where you type.";

/** The page's one privacy promise, with its one limit said right under it. */
export const LANDING_STATEMENT = "No account. No upload. Your words never leave your device.";
export const LANDING_STATEMENT_NOTE = "Unless you turn on AI with your own key.";

// One feature each, shown working. Nothing here appears until you ask for it:
// the palette and the Markdown itself bring it up.
export const LANDING_FEATURES: LandingFeature[] = [
  {
    id: "palette",
    eyebrow: "Command palette",
    title: "Everything is one keystroke away.",
    body: "Ctrl/Cmd+P finds files, commands, headings and tasks.",
    demo: "palette",
  },
  {
    id: "tables",
    eyebrow: "Tables",
    title: "Tables, by keyboard.",
    body: "Tab to the next cell. The columns realign as you type.",
    demo: "table",
  },
  {
    id: "render",
    eyebrow: "Diagrams & formulas",
    title: "Write it. See it drawn.",
    body: "Diagrams and formulas render in place once the caret moves on.",
    demo: "render",
  },
  {
    id: "focus",
    eyebrow: "Focus",
    title: "Just the sentence you\u2019re writing.",
    body: "Ctrl/Cmd+Alt+Z hides everything else and can dim all but your sentence.",
    demo: "focus",
  },
];

/** The files chapter, after the features. */
export const LANDING_FILES: LandingFeature = {
  id: "files",
  eyebrow: "Files",
  title: "Your files, where they are.",
  body: "Open a folder or an Obsidian vault where it is: write notes, edit code with syntax highlighting, view images and PDFs. Pin the notes you use most and give them an emoji.",
  demo: "files",
};

// The plain facts and trade-offs, each said once. "Account" is worded so the
// page's one "No account" stays the statement's.
export const LANDING_SPECS: LandingSpec[] = [
  {
    label: "Files",
    value: "Notes are plain Markdown (.md). Code and config files open with syntax highlighting, other text files as plain text, images as pictures, and PDFs in a built-in viewer. Obsidian vaults open as-is, and wikilinks keep working.",
  },
  {
    label: "Storage",
    value: "Chrome and Edge on a computer: a folder on your disk. Safari, Firefox and phones: browser storage on the device, so export a zip now and then.",
  },
  { label: "Account", value: "None needed." },
  { label: "Offline", value: "Works offline once installed as an app from your browser." },
  {
    label: "AI",
    value: "Off by default. Uses your own key, or a local Ollama model. Requests pass through the HermesMarkdown server, which stores nothing; Ollama is called straight from your browser.",
  },
  { label: "Export", value: "PDF, HTML, or the whole vault as a zip." },
  { label: "Themes", value: "Three light and three dark." },
  { label: "Keyboard", value: "Optional Vim keys." },
];

export const LANDING_FAQ: LandingFaq[] = [
  {
    q: "Where are my files stored?",
    a: "In a vault you choose: a folder of Markdown files on your disk or a browser vault kept in your browser's own storage. Files are never uploaded to a HermesMarkdown server.",
  },
  {
    q: "What if my browser clears its data?",
    a: "A folder on your disk is unaffected, because the files live in the folder. A browser vault lives in browser storage, which the browser may clear when space runs low or when you clear site data, so keep a copy: export the vault as a zip from the command palette.",
  },
  {
    q: "What happens to my text when I use AI?",
    a: "AI is off until you add your own API key. The key stays in your browser. When you ask for something, the text you send and your key pass through the HermesMarkdown server to Anthropic, Google or your chosen provider for that single request. HermesMarkdown does not store either. A local Ollama model is called straight from your browser.",
  },
  {
    q: "Can I open my Obsidian vault?",
    a: "Yes. A vault is a folder of Markdown files. Open it in Chrome or Edge on a computer and edit it in place. Wikilinks keep working.",
  },
  {
    q: "How do I get my notes out?",
    a: "They are already plain .md files. From a browser vault, export everything as a zip from the command palette.",
  },
];
