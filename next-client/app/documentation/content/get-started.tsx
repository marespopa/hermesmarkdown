import { Callout, KV, ShortcutGroups, type Group } from "../doc-primitives";

// Documentation content: Get Started group.
export const getStartedGroup: Group = {
  id: "get-started",
  label: "Get Started",
  items: [
    {
      id: "installation",
      title: "Installation",
      lead: "HermesMarkdown is a web app — there's nothing to download or install in the traditional sense.",
      keywords: "browser chrome edge firefox safari pwa install",
      body: (
        <>
          <p>
            Vaults are read and written through the browser's File System Access API, which only
            Chromium-based browsers implement. Use one of the browsers below.
          </p>
          <KV
            rows={[
              { label: "Google Chrome", value: "Supported" },
              { label: "Microsoft Edge", value: "Supported" },
              { label: "Brave / Arc / Opera", value: "Supported" },
              { label: "Firefox", value: "Not supported" },
              { label: "Safari", value: "Not supported" },
            ]}
          />
          <Callout type="note">
            On an unsupported browser, the editor still loads, but the vault picker is disabled —
            there's no folder to open or save to.
          </Callout>
          <p>
            HermesMarkdown ships a web app manifest, so supported browsers offer an Install option
            in the address bar. Installing gives it its own window and app icon, but doesn't change
            how it works — it's the same browser-based app, not a native build.
          </p>
        </>
      ),
    },
    {
      id: "create-a-vault",
      title: "Create a vault",
      lead: "A vault is any folder on disk that HermesMarkdown reads and writes Markdown files in directly.",
      keywords: "vault folder open dropbox icloud sync",
      body: (
        <>
          <p>Choose <strong>Open Vault</strong> from the command palette and pick an existing folder, or create a new one in the picker.</p>
          <p>
            The browser grants HermesMarkdown direct read/write access to that folder for the
            session. Nothing is uploaded — files stay where they are on disk.
          </p>
          <p>
            Everything in the folder — your notes, your subfolders — is yours; HermesMarkdown never
            restructures it. The only thing it adds on its own is an <code>assets/</code> folder at
            the vault root, created the first time you paste or drop an image into a note.
          </p>
          <Callout type="warning">
            Dropbox and iCloud can lock files mid-sync. If saves start failing inside a synced folder,
            pause the sync client and retry.
          </Callout>
        </>
      ),
    },
    {
      id: "new-vault",
      title: "New vault",
      lead: "Create a fresh, empty vault — name it, pick a location, and start writing.",
      keywords: "new vault create folder name location",
      body: (
        <>
          <p>
            Choose <strong>New Vault</strong> from the command palette.
          </p>
          <p>
            Type a vault name (this becomes the folder name on disk) and click <em>Choose parent folder</em> to pick
            where the folder will be created, then click <em>Create Vault</em>.
          </p>
          <p>
            HermesMarkdown creates the folder and opens the vault on a blank note. No example content
            is added.
          </p>
          <Callout type="note">
            The dialog checks for an existing folder with the same name at the chosen location and stops if one is
            found — it will never overwrite an existing directory.
          </Callout>
        </>
      ),
    },
    {
      id: "first-note",
      title: "Your first note",
      lead: "Start a blank note immediately; organize it after you have begun writing.",
      keywords: "new file save autosave frontmatter",
      body: (
        <>
          <p>
            Choose <strong>New File</strong> from the command palette (or press{" "}
            <code>CTRL+ALT+N</code>), then select a destination folder and enter a file name.
          </p>
          <p>
            HermesMarkdown creates an empty file in the folder you select with the name you provide —
            no template or metadata is added. Want frontmatter? Type <code>/frontmatter</code> to
            insert a starter block. See{" "}
            <a href="#frontmatter" className="text-sage font-semibold hover:underline">Frontmatter</a>.
          </p>
          <p>
            Save manually with <code>CTRL+S</code>, or rely on autosave — configurable under{" "}
            <a href="#appearance" className="text-sage font-semibold hover:underline">Settings → Autosave</a>.
            The save indicator shows whether the file has unsaved changes.
          </p>
        </>
      ),
    },
    {
      id: "editor-layout",
      title: "Editor layout",
      lead: "The app opens straight into a full-screen editor; navigation lives in dedicated views and the command palette.",
      keywords: "explorer files search views tags tasks settings theme pane split toolbar command palette",
      body: (
        <>
          <p>
            There's no formatting toolbar above the text. Formatting happens through Markdown syntax,
            keyboard shortcuts, and the slash command menu.
          </p>
          <p>
            Open the dedicated Explorer with <code>CTRL/CMD+SHIFT+E</code> (or <code>CTRL/CMD+B</code>{" "}
            when the cursor isn&apos;t in a note, where it means Bold) or the <strong>Open Explorer</strong> command.
            It provides a full workspace view for browsing, organizing, renaming, moving, and deleting files and folders without
            covering the editor. Tasks uses a matching dedicated view; file search, tags, and headings are available through the command palette.
          </p>
          <KV
            rows={[
              { label: "Explorer", value: "Dedicated files view / CTRL/CMD+SHIFT+E" },
              { label: "Quick switcher", value: "CTRL/CMD+K or CTRL/CMD+P" },
              { label: "Command palette", value: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
              { label: "Search files", value: "CTRL/CMD+SHIFT+F" },
              { label: "Palette modes", value: "# vault tags · > commands · ! tasks · @ current-note headings" },
              { label: "Explorer controls", value: "New note, new folder, and file actions" },
              { label: "AI Chat", value: "CTRL+SHIFT+B" },
              { label: "Voice input", value: "CTRL+SHIFT+V" },
              { label: "Keyboard shortcuts", value: "Show keyboard shortcuts command" },
            ]}
          />
          <p>
            On phones, the file overlay also has a <strong>Views</strong> tab with Smart Workspaces:
            saved, rule-based filters over your notes&apos; tags and frontmatter.
          </p>
          <p>
            Open several files side by side: split right from the tab bar, drag tabs between panes,
            and resize with the divider.
          </p>
        </>
      ),
    },
    {
      id: "keyboard-shortcuts",
      title: "Keyboard shortcuts",
      lead: "The full reference, grouped by where you're using it.",
      keywords: "shortcuts ctrl tab arrows formula",
      body: (
        <ShortcutGroups
          groups={[
            {
              context: "Editor",
              rows: [
                { label: "Save", shortcut: "CTRL/CMD+S" },
                { label: "Bold", shortcut: "CTRL/CMD+B" },
                { label: "Italic", shortcut: "CTRL/CMD+I" },
                { label: "Strikethrough", shortcut: "CTRL/CMD+SHIFT+X" },
                { label: "Inline code", shortcut: "CTRL/CMD+E" },
                { label: "Undo / redo", shortcut: "CTRL/CMD+Z / CTRL+Y" },
                { label: "Indent / outdent list item", shortcut: "TAB / SHIFT+TAB" },
                { label: "Cycle task status", shortcut: "CTRL/CMD+ENTER" },
                { label: "Open helper at cursor (link, date, diagram, image)", shortcut: "CTRL/CMD+SHIFT+ENTER" },
                { label: "AI Chat", shortcut: "CTRL+SHIFT+B" },
                { label: "Voice input", shortcut: "CTRL+SHIFT+V" },
                { label: "Dismiss / close", shortcut: "ESCAPE" },
              ],
            },
            {
              context: "Tabs & files",
              rows: [
                { label: "Open Explorer", shortcut: "CTRL/CMD+SHIFT+E" },
                { label: "New file", shortcut: "CTRL+ALT+N" },
                { label: "Close current tab", shortcut: "CTRL/CMD+ALT+W" },
                { label: "Select workspace tab", shortcut: "CTRL/CMD+1–9" },
              ],
            },
            {
              context: "Table",
              rows: [
                { label: "Next / previous cell", shortcut: "TAB / SHIFT+TAB" },
                { label: "Cell below (adds a row at the end)", shortcut: "ENTER" },
                { label: "Move across cells, leave the table", shortcut: "ARROWS" },
                { label: "Leave the table", shortcut: "ESCAPE" },
                { label: "Insert row below", shortcut: "CTRL/CMD+ENTER" },
                { label: "Delete row", shortcut: "CTRL/CMD+SHIFT+BACKSPACE" },
                { label: "Move row up / down", shortcut: "ALT+↑ / ALT+↓" },
                { label: "Move column left / right", shortcut: "CTRL/CMD+ALT+← / →" },
                { label: "Row, column & table actions", shortcut: "RIGHT-CLICK a cell" },
              ],
            },
            {
              context: "Navigation",
              rows: [
                { label: "Open Link or Date", shortcut: "CTRL+CLICK" },
                { label: "Toggle task checkbox", shortcut: "CLICK [ ] / [x]" },
                { label: "Cycle lifecycle tag", shortcut: "CLICK ‹ #tag ›" },
              ],
            },
            {
              context: "Command Palette",
              rows: [
                { label: "Open Quick Switcher", shortcut: "CTRL/CMD+K or CTRL/CMD+P" },
                { label: "Open Command Palette", shortcut: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
                { label: "Search files", shortcut: "CTRL/CMD+SHIFT+F" },
                { label: "Filter", shortcut: "Keep typing" },
                { label: "Navigate results", shortcut: "↑ / ↓ or TAB" },
                { label: "Pin / unpin the selected item", shortcut: "CTRL/CMD+D" },
                { label: "Run command", shortcut: "ENTER" },
                { label: "Dismiss", shortcut: "ESCAPE" },
              ],
            },
          ]}
        />
      ),
    },
  ],
};
