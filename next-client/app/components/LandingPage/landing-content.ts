// Copy for the home page scenes below the hero. The FAQ is also the
// home page's FAQPage structured data (app/page.tsx), so the two never drift.

export type LandingPoint = { title: string; body: string };
export type LandingScene = {
  id: string;
  headline: string;
  accentLine: string;
  lead: string;
  points: LandingPoint[];
};
export type LandingFaq = { q: string; a: string };

export const LANDING_SCENES: LandingScene[] = [
  {
    id: "quiet",
    headline: "Only your words.",
    accentLine: "The rest stays out of the way.",
    lead: "A calm page that shows the Markdown marks only where you are typing.",
    points: [
      { title: "Marks on your line only", body: "Syntax appears on the line you're on and hides everywhere else." },
      { title: "One palette for everything", body: "Ctrl/Cmd+P finds files, commands, headings, tasks and note text." },
      { title: "No Distraction Mode", body: "Ctrl/Cmd+Alt+Z hides everything but the page." },
      { title: "Flow mode and Vim keys", body: "Fade all but the paragraph you're writing, or edit with Vim keys." },
    ],
  },
  {
    id: "more",
    headline: "Tables, tasks and sketches.",
    accentLine: "Still plain Markdown.",
    lead: "More than notes, and every file stays readable in any other editor.",
    points: [
      { title: "Tables with formulas", body: "Edit pipe tables like a spreadsheet, with =SUM and more." },
      { title: "All your tasks, one page", body: "Every task in the vault on a single Tasks page." },
      { title: "Drawing boards", body: "Sketch on boards that are stored as Markdown." },
      { title: "Inline calculator", body: "Write rent + utilities and the result appears at the end of the line." },
      { title: "Diagrams and math", body: "Mermaid diagrams and math are rendered in place." },
      { title: "Code files, too", body: "Highlighting, an outline and Format Code with your Prettier config." },
    ],
  },
  {
    id: "files",
    headline: "Your files, on your disk.",
    accentLine: "No account.",
    lead: "Open a folder and edit its files where they already are.",
    points: [
      { title: "Edit in place, offline too", body: "Nothing is uploaded and nothing needs a sign-up." },
      { title: "Obsidian vaults open as-is", body: "A vault is a folder of Markdown files, and wikilinks keep working." },
      { title: "Keep it in git", body: "Commit with your own tools; the vault is a plain folder." },
      { title: "Any browser, any device", body: "Safari, Firefox, iPhone, iPad and Android keep files in a browser vault on the device." },
    ],
  },
  {
    id: "extras",
    headline: "Export and AI,",
    accentLine: "only if you want them.",
    lead: "Both stay out of sight until you reach for them.",
    points: [
      { title: "Export", body: "Save a note as PDF, a standalone HTML page or compiled Markdown." },
      { title: "AI with your own key", body: "Off until you add a key, and every change is shown as a diff you accept or reject." },
    ],
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
    q: "What if my browser clears its data?",
    a: "A folder on your disk is unaffected, because the files live in the folder. A browser vault lives in browser storage, which the browser may clear when space runs low or when you clear site data, so keep a copy: export the vault as a zip from the command palette.",
  },
  {
    q: "What happens to my text when I use AI?",
    a: "AI is off until you add your own API key. The key stays in your browser. When you ask for something, the text you send and your key pass through the HermesMarkdown server to Anthropic, Google or your chosen provider for that single request. HermesMarkdown does not store either. A local Ollama model is called straight from your browser.",
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
