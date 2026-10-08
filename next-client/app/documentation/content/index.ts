import type { Group } from "../doc-primitives";
import { aiFeaturesGroup } from "./ai-features";
import { editorWorkspaceItems } from "./editor-workspace";
import { editorWritingItems } from "./editor-writing";
import { getStartedGroup } from "./get-started";
import { mobileGroup, settingsGroup } from "./settings-mobile";
import { templatesItems } from "./templates";
import { vaultGroup } from "./vault";

// Section order of the /documentation page. Each summary is the one line on
// the section's topic card.
export const GROUPS: Group[] = [
  { ...getStartedGroup, summary: "Open a folder or a browser vault and write your first note." },
  {
    id: "editor",
    label: "Editor",
    summary: "Writing, Markdown marks, tables, templates, tabs and split panes.",
    items: [...editorWritingItems, ...templatesItems, ...editorWorkspaceItems],
  },
  { ...vaultGroup, summary: "How notes are stored: folders on disk, browser vaults and GitHub." },
  { ...aiFeaturesGroup, summary: "Bring your own key for chat, drafting, formulas and more." },
  { ...settingsGroup, summary: "Appearance, Home and vault options, and keyboard shortcuts." },
  { ...mobileGroup, summary: "Using HermesMarkdown on a phone or tablet." },
];
