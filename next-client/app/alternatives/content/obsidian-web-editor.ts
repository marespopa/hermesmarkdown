import type { AlternativeEntry } from "./types";

export const OBSIDIAN_WEB_EDITOR: AlternativeEntry = {
  slug: "obsidian-web-editor",
  competitor: "Obsidian",
  title: "A Web Editor for Your Obsidian Vault | HermesMarkdown",
  description:
    "Obsidian runs as a desktop and mobile app. HermesMarkdown is a Markdown editor in the browser that opens the same folder of .md files, with WikiLinks and callouts.",
  lead: "Edit a folder of Markdown notes, WikiLinks included, from any browser without installing anything.",
  keywords: [
    "obsidian web editor",
    "obsidian in browser",
    "obsidian alternative",
    "obsidian web version",
    "edit obsidian vault online",
    "obsidian alternative web based",
  ],
  whySwitch: [
    {
      title: "Open a vault from a browser",
      body: "Obsidian is a desktop and mobile app. On a computer where you can't install software, HermesMarkdown opens the same folder in Chrome or Edge.",
    },
    {
      title: "Same plain files",
      body: "A vault is a folder of .md files, and so is a HermesMarkdown vault. It doesn't move, rename or restructure what's there.",
    },
    {
      title: "WikiLinks and callouts",
      body: "[[Wikilinks]] and callouts written in Obsidian-compatible syntax work, because they are plain text in your files.",
    },
    {
      title: "Quiet by design",
      body: "One editor, a command palette and a sidebar. HermesMarkdown does not try to match Obsidian's plugin ecosystem; it aims to stay small.",
    },
  ],
  comparison: [
    { feature: "Where it runs", hermes: "In the browser; optionally installed as an app", them: "Desktop and mobile apps" },
    { feature: "Web client", hermes: "That is what it is", them: "No browser version of the editor" },
    { feature: "Notes", hermes: "Plain .md files in a folder, or a browser vault", them: "Plain .md files in a vault folder" },
    { feature: "WikiLinks", hermes: "Yes", them: "Yes" },
    { feature: "Callouts", hermes: "Obsidian-compatible syntax", them: "Yes" },
    { feature: "Plugins", hermes: "No plugin system", them: "A large community plugin ecosystem" },
    { feature: "Account", hermes: "None", them: "Not needed to use local vaults" },
  ],
  faq: [
    {
      q: "Is HermesMarkdown an Obsidian plugin or an official web version?",
      a: "No. It is a separate editor that is not made by or affiliated with Obsidian. It works with the same kind of files, plain Markdown in folders.",
    },
    {
      q: "Can it open my Obsidian vault?",
      a: "Yes, in Chrome, Edge and other Chromium browsers: choose the vault's folder and it opens as a vault. Safari and Firefox can't open folders, so there you import files into a browser vault.",
    },
    {
      q: "Will it change my notes or my .obsidian folder?",
      a: "It reads and writes the Markdown files you open and otherwise leaves the folder alone. Obsidian's own settings and plugin data are not touched by editing a note.",
    },
    {
      q: "Which Obsidian features won't I find?",
      a: "Community plugins and anything that depends on them. HermesMarkdown covers writing, WikiLinks, tags, tasks, tables, callouts and search, not the whole Obsidian plugin ecosystem.",
    },
    {
      q: "Does it use frontmatter?",
      a: "Frontmatter is optional and free-form. A few fields are read by the app and the rest is left as you wrote it.",
    },
    {
      q: "Does it sync between devices?",
      a: "There is no sync service. A folder can sit in a folder your own sync tool already handles, and a browser vault can be exported as a zip.",
    },
  ],
  related: [
    { label: "Edit an Obsidian vault in your browser", href: "/guides/edit-obsidian-vault-in-browser" },
    { label: "Vault overview", href: "/documentation/vault-overview" },
    { label: "WikiLinks", href: "/documentation/wikilinks" },
    { label: "Frontmatter conventions", href: "/documentation/frontmatter-conventions" },
    { label: "Markdown Cleaner", href: "/tools/markdown-cleaner" },
  ],
};
