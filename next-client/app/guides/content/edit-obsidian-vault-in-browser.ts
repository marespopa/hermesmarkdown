import type { GuideEntry } from "./types";

export const EDIT_OBSIDIAN_VAULT_IN_BROWSER: GuideEntry = {
  slug: "edit-obsidian-vault-in-browser",
  title: "How to Edit an Obsidian Vault in Your Browser | HermesMarkdown",
  description:
    "Open a folder of Obsidian notes in a browser, edit the Markdown and WikiLinks, and save back to the same files. Works in Chrome and Edge; browser vaults elsewhere.",
  lead: "Open the folder that holds your vault, edit notes in a browser tab, and the changes land in the same files.",
  keywords: [
    "edit obsidian vault in browser",
    "open obsidian vault online",
    "obsidian vault browser editor",
    "edit markdown vault without obsidian",
    "obsidian notes in browser",
  ],
  section: "Vaults",
  sections: [
    {
      heading: "Before you start",
      body: [
        "An Obsidian vault is a folder of plain Markdown files. HermesMarkdown reads and writes the same kind of files, so it can open that folder directly. It is a separate editor, not made by or affiliated with Obsidian.",
        "Opening a folder on disk needs a Chromium-based browser such as Chrome or Edge. Safari and Firefox can't open folders; there you import files into a browser vault instead.",
      ],
    },
    {
      heading: "Open the vault",
      body: [
        "Open HermesMarkdown, choose Create Vault from the vault menu or the start screen, and pick the folder that contains your notes. The browser asks you to allow access to that one folder, and nothing else on your disk is visible to the page.",
        "Subfolders and file names appear as they are. HermesMarkdown doesn't enforce a structure or move files around.",
      ],
    },
    {
      heading: "Edit notes and links",
      body: [
        "Write as you would anywhere else. [[Wikilinks]] between notes work, callouts written in Obsidian-compatible syntax render, and tasks, tags and tables are plain text in your files. Frontmatter is optional and free-form, and is left as you wrote it.",
        "Plugin-specific syntax stays as text. HermesMarkdown has no plugin system, so notes that depend on a plugin to display won't look the same here, though the text is untouched.",
      ],
    },
    {
      heading: "Keep it safe",
      body: [
        "Changes are written to the files in the folder you opened, so keep your usual backup or sync tool running on that folder. HermesMarkdown doesn't run or read git; commit and push with the tools you already use.",
        "Close the Obsidian app, or avoid editing the same note in both at once, so one editor doesn't overwrite what the other just saved.",
      ],
    },
  ],
  docs: ["create-a-vault", "vault-overview", "wikilinks", "callout-blocks", "frontmatter-conventions", "git"],
  faq: [
    {
      q: "Can I edit my vault on a computer where I can't install Obsidian?",
      a: "Yes, if the computer has Chrome, Edge or another Chromium browser. Open the vault's folder in HermesMarkdown and edit the notes there.",
    },
    {
      q: "Does editing here change my Obsidian settings?",
      a: "No. It reads and writes the Markdown files you open. The folder's .obsidian settings and plugin data are not edited by changing a note.",
    },
    {
      q: "What if I use Safari or Firefox?",
      a: "Those browsers can't open folders. Import the notes into a browser vault, edit them, and export the vault as a zip to take the files back.",
    },
    {
      q: "Do plugins work?",
      a: "No. Syntax that a plugin renders stays as plain text, and nothing is lost, but it won't display as it does in the plugin.",
    },
    {
      q: "Is anything uploaded?",
      a: "No. The folder is read and written by your browser on your device. Only the optional AI features contact a service, and only with your own key.",
    },
  ],
  related: [
    { label: "A web editor for your Obsidian vault", href: "/alternatives/obsidian-web-editor" },
    { label: "Markdown Cleaner", href: "/tools/markdown-cleaner" },
  ],
};
