// Copy for the home page scenes below the hero. The FAQ is also the
// home page's FAQPage structured data (app/page.tsx), so the two never drift.
// It keeps to storage, privacy and browsers: where a claim on the page has a
// limit, the limit is said beside it too, not only here.

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
    headline: "A quiet page.",
    accentLine: "Marks only where you type.",
    lead: "A calm page that shows the Markdown marks only where you are typing.",
    points: [
      { title: "Marks on your line only", body: "Syntax appears on the line you're on and hides everywhere else." },
      { title: "One palette for everything", body: "Ctrl/Cmd+P finds files, commands, headings, tasks and note text." },
      { title: "Focus", body: "Ctrl/Cmd+Alt+Z hides everything but the page, and can fade all but the paragraph or sentence you're writing." },
    ],
  },
  {
    id: "files",
    headline: "Your files, on your disk.",
    accentLine: "No account.",
    lead: "Open a folder and edit its files where they already are.",
    points: [
      { title: "Nothing is uploaded", body: "No sign-up and no sync. Nothing you write leaves your device unless you turn on AI." },
      { title: "Folders in Chrome and Edge", body: "On a computer they edit a folder on your disk. Other browsers, phones and tablets keep notes in browser storage, which the browser can clear, so export a zip to keep a copy." },
      { title: "Obsidian vaults open as-is", body: "A vault is a folder of Markdown files, and wikilinks keep working." },
      { title: "Keep it in git", body: "Commit with your own tools; the vault is a plain folder." },
    ],
  },
  // Everything past writing, in one quiet row: a sentence, no grid. It names
  // only what the palette or the Markdown itself brings up.
  {
    id: "more",
    headline: "When you need more,",
    accentLine: "it's already there.",
    lead: "The command palette reaches everything you do: tasks, export to PDF or HTML, Vim keys, themes and AI with your own key. The Markdown does the rest: type a diagram or a formula block and it renders in place. Code files in your folder open too. Nothing shows until you ask for it, and every file stays plain Markdown.",
    points: [],
  },
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
    q: "Does it work offline?",
    a: "Yes, once it is installed. Nothing needs installing to start, but to write without a connection, install it as an app from your browser. Only the optional AI features need the network.",
  },
  {
    q: "Does it work on Safari, Firefox, iPhone and iPad?",
    a: "Yes. Chrome and Edge on a computer edit a folder on your disk. Where the browser can't open a folder, as in Safari, Firefox and mobile browsers, files are kept in a browser vault on the device.",
  },
];
