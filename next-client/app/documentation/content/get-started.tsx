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
      keywords: "browser chrome edge firefox safari ios iphone ipad android pwa install offline",
      body: (
        <>
          <p>
            Every modern browser can run HermesMarkdown. What differs is where a vault can live:
            opening a folder on disk needs the File System Access API, which only Chromium-based
            browsers implement. Everywhere else, you use a{" "}
            <a href="#browser-vaults" className="text-sage font-semibold hover:underline">browser vault</a>.
          </p>
          <KV
            rows={[
              { label: "Chrome / Edge / Brave / Arc / Opera", value: "Disk folders, browser vaults, GitHub" },
              { label: "Firefox", value: "Browser vaults, GitHub" },
              { label: "Safari (macOS, iOS, iPadOS)", value: "Browser vaults, GitHub" },
            ]}
          />
          <p>
            Install it as an app: use <em>Install</em> in the address bar (Chromium), <em>Add to
            Dock</em> (Safari on macOS), or <em>Share → Add to Home Screen</em> (iOS). The installed
            app opens in its own window and starts without a network connection once it has been
            loaded online.
          </p>
          <Callout type="note">
            Offline, everything except AI features and GitHub sync keeps working. Notes are never
            sent anywhere unless you use those features.
          </Callout>
        </>
      ),
    },
    {
      id: "browser-vaults",
      title: "Browser vaults",
      lead: "A vault stored in the browser's private storage — for Safari, Firefox, phones, and tablets.",
      keywords: "browser vault opfs safari firefox ios mobile offline storage backup export import zip",
      body: (
        <>
          <p>
            Choose <strong>Browser vaults…</strong> from the command palette (or <em>Browser Vault</em>{" "}
            on the start screen), name the vault, and click <em>Create</em>. It works like any other
            vault — folders, WikiLinks, tasks, attachments — but the files live inside this
            browser's storage instead of a folder you can see on disk.
          </p>
          <KV
            rows={[
              { label: "Browser vaults…", value: "Create, reopen, or delete browser vaults" },
              { label: "Export vault as zip", value: "Download every file as a backup (any vault)" },
              { label: "Export vault to folder…", value: "Copy the vault into a folder on disk (Chromium)" },
              { label: "Import files into vault…", value: "Add a zip, notes, or attachments" },
              { label: "Import folder into vault…", value: "Add a whole folder (desktop browsers)" },
            ]}
          />
          <p>
            Imports never overwrite: a file whose name is taken is saved as <code>name (1).md</code>.
            To move a vault to another browser or device, export it as a zip there and import the
            zip into a new browser vault.
          </p>
          <Callout type="warning">
            A browser vault exists only in this browser. Clearing site data deletes it, and Safari
            may remove site data after about seven days without use unless the app is installed or
            storage is marked as kept (the dialog shows this and offers <em>Keep data</em>). Export
            regularly — HermesMarkdown reminds you when a vault hasn't been backed up for two weeks.
          </Callout>
          <p>
            Need the same notes on several devices? Use a GitHub vault instead: it syncs through a
            repository you choose.
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
          <p>
            Opening folders on disk needs a Chromium-based browser. In Safari and Firefox, choose{" "}
            <a href="#browser-vaults" className="text-sage font-semibold hover:underline">a browser vault</a>{" "}
            instead.
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
            HermesMarkdown creates the folder and opens the vault on its{" "}
            <a href="#home-feed" className="text-sage font-semibold hover:underline">home feed</a>.
            No example content is added.
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
      lead: "Start typing. On its first save the note asks which folder to go in, and it is named after its first line.",
      keywords: "new file new note draft save autosave name title folder frontmatter",
      body: (
        <>
          <p>
            Press <code>CTRL+ALT+N</code>, click <strong>+</strong> on the home feed, or choose{" "}
            <strong>New file</strong> from the command palette. A blank note opens, ready to type,
            with no name prompt.
          </p>
          <p>
            The note is saved to your vault once you finish the first line, or when you press{" "}
            <code>CTRL/CMD+S</code>. The file is named after
            the first line, for example <code>Trip ideas.md</code>. If the first line has no usable
            text, the date and time are used instead, like <code>2026-09-28 1432.md</code>. An
            existing file is never overwritten: a taken name becomes <code>Trip ideas (1).md</code>.
          </p>
          <p>
            The first save asks which folder the note goes in, with your default folder already
            selected: press <code>Enter</code> to accept it, or type to filter the list or name a new
            folder. If you dismiss the picker, the note stays an unsaved draft and nothing asks again,
            even after a reload; press <code>CTRL/CMD+S</code> when you're ready to choose.
          </p>
          <p>
            A note you leave empty is never saved, so no empty files pile up in your vault. Renaming
            the first line later does not rename the file; use <strong>Rename current file</strong>{" "}
            for that.
          </p>
          <KV
            rows={[
              { label: "Default folder for new notes", value: "Vault root · Settings → New Notes Folder" },
              { label: "Pick a folder and name first", value: "New file in folder… command" },
              { label: "Create from a search", value: 'Type a title in the palette, then Create "…"' },
            ]}
          />
          <p>
            No template or metadata is added. Want frontmatter? Type <code>/frontmatter</code> to
            insert a starter block. See{" "}
            <a href="#frontmatter" className="text-sage font-semibold hover:underline">Frontmatter</a>.
            Autosave can be changed under{" "}
            <a href="#appearance" className="text-sage font-semibold hover:underline">Settings → Autosave</a>.
            With autosave set to manual, a new note is saved only when you press <code>CTRL/CMD+S</code>.
          </p>
        </>
      ),
    },
    {
      id: "home-feed",
      title: "Home feed",
      lead: "Your recent notes, newest first. It's where a vault opens.",
      keywords: "home feed recent notes start screen today yesterday preview search create new note welcome week strip calendar days jump no vault open vault create vault browser vault open file",
      body: (
        <>
          <p>
            Each row shows a note's title and the first few lines of its text. The column on the
            left groups notes by the day they were last changed: <em>Today</em>,{" "}
            <em>Yesterday</em>, the weekday for the rest of the week, then the date. If you entered
            your name during setup, the feed greets you with it.
          </p>
          <p>
            Under the date, a strip shows the last seven days. A dot marks each day you changed a
            note. Tap a day to jump to its notes. Days without notes are dimmed.
          </p>
          <p>
            With no vault open, the feed is where you start. It offers <strong>Open Vault</strong>,{" "}
            <strong>Create Vault</strong> and <strong>Browser Vault</strong>, or you can skip the
            vault: <strong>New Note</strong> opens a blank draft and <strong>Open File…</strong>{" "}
            opens a file from your device. Once a vault is open, your notes appear here.
          </p>
          <p>
            At the bottom, <strong>Search or create a note…</strong> opens the command palette.
            Type to find a note, or type a new title and pick <strong>Create &quot;…&quot;</strong>{" "}
            to start that note. The <strong>&gt;</strong> button opens the palette&apos;s command
            list, and <strong>+</strong> starts a blank note.
          </p>
          <KV
            rows={[
              { label: "Move between notes", value: "↑ / ↓ or J / K" },
              { label: "Open the selected note", value: "ENTER" },
              { label: "Search", value: "Start typing" },
              { label: "Back to your open notes", value: "ESCAPE" },
              { label: "Come back to the feed", value: "Home at the top of the sidebar" },
              { label: "Back to the top of the feed", value: "Home again while the feed is open" },
            ]}
          />
          <p>
            On desktop, Home is at the top of the sidebar. On phones it&apos;s at the top left.
          </p>
          <p>
            In a large vault, notes appear right away in the correct order. Their previews fill in
            from the top down while <em>Indexing notes…</em> is shown. Notes that haven&apos;t
            changed since last time load instantly from a cache kept in your browser.
          </p>
          <Callout type="tip">
            Prefer to reopen the notes you had open last time? Set{" "}
            <strong>Settings → On Vault Open</strong> to <em>Resume last tabs</em>. The feed is still
            one click away.
          </Callout>
        </>
      ),
    },
    {
      id: "editor-layout",
      title: "Editor layout",
      lead: "A full-screen editor with a slim header. Everything else is in the command palette and a few dedicated views.",
      keywords: "explorer files search views tags tasks settings theme pane split toolbar sidebar command palette",
      body: (
        <>
          <p>
            There's no formatting toolbar above the text. Formatting happens through Markdown syntax,
            keyboard shortcuts, and the slash command menu.
          </p>
          <p>
            The toolbar at the top shows your open notes as tabs, even when only one is open. On the left:
            the <strong> Sidebar</strong> button, while the sidebar is hidden. On the right: Save, Edit / Preview, Search (the
            command palette) and AI Chat (when an AI key is set). The <strong>&hellip; More</strong> menu holds Copy
            Markdown, Split Right, Settings, Help and Hide Toolbar — every one of them is also in the command palette.
          </p>
          <p>
            Toolbar buttons are icons; hover one to see its name and shortcut. Right-click the
            toolbar to hide it.
          </p>
          <p>
            The <strong>sidebar</strong> lists your open notes across every pane. With a vault it also starts with Home and ends with the file tree. Show
            it with the Sidebar button at the toolbar's far left and hide it with the button in its own header, or toggle it with{" "}
            <code>CTRL/CMD+ALT+S</code> or the <strong>Show sidebar</strong>{" "}
            command (the welcome tour offers it too), and drag its edge to resize it (double-click the edge to
            reset). The Explorer below remains the place for bigger file work.
          </p>
          <p>
            Open the dedicated Explorer with <code>CTRL/CMD+SHIFT+E</code> (or <code>CTRL/CMD+B</code>{" "}
            when the cursor isn&apos;t in a note, where it means Bold) or the <strong>Open Explorer</strong> command.
            It provides a full workspace view for browsing, organizing, renaming, moving, and deleting files and folders without
            covering the editor. Tasks uses a matching dedicated view; file search, tags, and headings are available through the command palette.
          </p>
          <KV
            rows={[
              { label: "Home feed", value: "Home button in the toolbar" },
              { label: "Sidebar", value: "Show: Sidebar button at the toolbar's far left / Hide: button in the sidebar's header / CTRL/CMD+ALT+S" },
              { label: "Explorer", value: "Dedicated files view / CTRL/CMD+SHIFT+E" },
              { label: "Quick switcher", value: "CTRL/CMD+K or CTRL/CMD+P" },
              { label: "Command palette", value: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
              { label: "Search note text", value: "CTRL/CMD+SHIFT+F" },
              { label: "Palette modes", value: "# vault tags · > commands · ! tasks · @ current-note headings · / note text" },
              { label: "Commands on or off", value: "The > button in the search field" },
              { label: "Explorer controls", value: "Refresh, new note, new folder, and file actions" },
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
            Open several files side by side: choose <strong>Split Right</strong> from the toolbar&apos;s More menu or run <strong>Split pane right</strong> from the command palette (or <strong>Open in pane</strong> on a tab),
            drag tabs between panes, and resize with the divider.
          </p>
          <p>
            To be alone with the text, choose <strong>Hide Toolbar</strong> from the More menu (or press{" "}
            <code>Ctrl/Cmd+Alt+T</code>, or run <strong>Hide toolbar</strong>) and
            the tabs and toolbar slide away. A small chevron in the top-right corner brings them back.
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
                { label: "Hide / show toolbar", shortcut: "CTRL/CMD+ALT+T" },
                { label: "Show / hide sidebar", shortcut: "CTRL/CMD+ALT+S" },
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
              context: "Home feed",
              rows: [
                { label: "Move between notes", shortcut: "↑ / ↓ or J / K" },
                { label: "Open the selected note", shortcut: "ENTER" },
                { label: "Search", shortcut: "Start typing" },
                { label: "Back to your open notes", shortcut: "ESCAPE" },
              ],
            },
            {
              context: "Command Palette",
              rows: [
                { label: "Open Quick Switcher", shortcut: "CTRL/CMD+K or CTRL/CMD+P" },
                { label: "Open Command Palette", shortcut: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
                { label: "Search note text", shortcut: "CTRL/CMD+SHIFT+F" },
                { label: "Filter", shortcut: "Keep typing" },
                { label: "Switch between files and commands", shortcut: "CLICK >" },
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
