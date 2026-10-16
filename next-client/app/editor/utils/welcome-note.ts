import { formatShortcut } from "@/app/utils/platform";

// The note a first visit opens in the draft: a short tour you read in the
// editor itself, then clear (or keep) like any draft. Plain text: no tokens.
export function welcomeNote(isMobileChrome: boolean): string {
  const palette = isMobileChrome
    ? "Tap the **menu button** to open the command palette: notes, commands and settings in one search."
    : `Press **${formatShortcut("k")}** to open the command palette: notes, commands and settings in one search.`;
  return [
    "# Welcome",
    "",
    "This is a draft: plain Markdown, yours to write over. Select all and delete it when you're ready to start.",
    "",
    "## The basics",
    "",
    `- ${palette}`,
    "- Type **/** for links, dates, tasks, tables and templates.",
    "- Type **[[** to link to another note.",
    "- `- [ ]` makes a task; every open task shows up in **Tasks**.",
    "",
    "## Start from a template",
    "",
    "An empty note offers a few templates under its first line. Add whole packs (meetings, writing, projects, journal…) from **Templates**, then edit them; they're plain files in your folder.",
    "",
    "## Where your notes live",
    "",
    "Choose a folder and every note is a `.md` file in it, readable by any other app. Nothing leaves your device unless you say so.",
    "",
  ].join("\n");
}
