import { Callout, KV, type Group } from "../doc-primitives";
import { keyboardShortcutsItem } from "./keyboard-shortcuts";

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
            <a href="#browser-vaults" className="text-accent hover:underline">browser vault</a>.
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
      keywords: "browser vault opfs safari firefox ios mobile offline storage backup export import zip rename name",
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
              { label: "Browser vaults…", value: "Create, reopen, rename (pencil), or delete browser vaults" },
              { label: "Rename vault…", value: "Rename the open browser vault; its notes stay as they are" },
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
            <a href="#browser-vaults" className="text-accent hover:underline">a browser vault</a>{" "}
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
            <a href="#home-feed" className="text-accent hover:underline">home feed</a>.
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
      lead: "Start typing. On its first save the note goes into your New Notes folder, named after its first line.",
      keywords: "new file new note draft save autosave name title folder frontmatter",
      body: (
        <>
          <p>
            Press <code>CTRL+ALT+N</code>, click <strong>+</strong> on the home feed, or choose{" "}
            <strong>New Note</strong> from the command palette. A blank note opens, ready to type,
            with no name prompt.
          </p>
          <p>
            The first time you open HermesMarkdown there is nothing to set up: you land on the
            home feed, where <strong>New Note</strong> starts a blank note. Once it has text, a bar
            at the bottom asks where your notes live. <strong>Choose Folder…</strong> picks a folder (you can make a new one in the
            picker) and saves the note there; in browsers that can&apos;t open folders it reads{" "}
            <strong>Keep Notes in This Browser</strong> and creates a{" "}
            <a href="#browser-vaults" className="text-accent hover:underline">browser vault</a>.{" "}
            <strong>Not Now</strong> shrinks it to a small &ldquo;Not saved to a folder&rdquo; mark;
            until you choose, the note is kept only in this browser. <code>CTRL/CMD+S</code> asks the
            same question.
          </p>
          <p>
            The note is saved to your vault once you finish the first line, or when you press{" "}
            <code>CTRL/CMD+S</code>. The file is named after
            the first line, for example <code>Trip ideas.md</code>. If the first line has no usable
            text, the date and time are used instead, like <code>2026-09-28 1432.md</code>. An
            existing file is never overwritten: a taken name becomes <code>Trip ideas (1).md</code>,
            so nothing you typed is lost.
          </p>
          <p>
            The note goes into your New Notes folder (the vault root unless you set one in
            Settings → Files), with no dialog. Move it anywhere later from the file tree.
          </p>
          <p>
            A note you leave empty is never saved, so no empty files pile up in your vault. Renaming
            the first line later does not rename the file; use <strong>Rename Note</strong>{" "}
            for that.
          </p>
          <KV
            rows={[
              { label: "Default folder for new notes", value: "Vault root · Settings → Files → Vault → New Notes Folder" },
              { label: "Start in a specific folder", value: "New Note in that folder's menu in Files" },
              { label: "Create from a search", value: 'Type a title in the palette, then Create "…"' },
            ]}
          />
          <p>
            No template or metadata is added. Want frontmatter? Type <code>/frontmatter</code> to
            insert a starter block. See{" "}
            <a href="#frontmatter" className="text-accent hover:underline">Frontmatter</a>.
            Autosave can be changed under{" "}
            Settings → Files → Autosave: <strong>After Delay</strong> (the default, two seconds after
            you stop typing) or{" "}
            <strong>Manual Only</strong>. With autosave set to manual, a new note is saved only when you
            press <code>CTRL/CMD+S</code>. To get a copy of a note outside your vault, run{" "}
            <strong>Download as Markdown</strong>: it always downloads the note as a <code>.md</code> file
            and never changes the saved note.
          </p>
        </>
      ),
    },
    {
      id: "home-feed",
      title: "Home feed",
      lead: "Your recent notes, newest first. It's where a vault opens.",
      keywords: "home feed vim keys keyboard j k gg recent notes pin pinned unpin start screen today yesterday preview search create new note welcome no vault open vault create vault browser vault open file open tasks todo",
      body: (
        <>
          <p>
            <strong>Tasks</strong> lists the unchecked <code>- [ ]</code> tasks from notes you
            changed in the last 7 days. Click one to open its note with the cursor on that task.
            The list starts folded: click <strong>N open tasks</strong> to open it, and it stays the way you leave it. Tasks from private notes aren&apos;t
            listed.
          </p>
          <p>
            Each row shows a note's title, the first few lines of its text and its file name. The column on the
            left groups notes by the day they were last changed: <em>Today</em>,{" "}
            <em>Yesterday</em>, the weekday for the rest of the week, then the date. If you add
            your name in Settings → Profile, the feed greets you with it.
          </p>
          <p>
            To keep a note at the top, click the pin at the top right of its row. It shows when you
            hover the row, and always on a phone or tablet. You can also touch and hold the row, or
            right-click it, and choose <strong>Pin to Home</strong>. The same item is in a tab&apos;s
            right-click menu, and <strong>Pin to Home</strong> in the command palette pins the open
            note. Pinned notes sit under{" "}
            <em>Pinned</em> above the days, newest pin first. Click the pin again, or run{" "}
            <strong>Unpin from Home</strong>, to put the note back. Each vault keeps its own pins.
          </p>
          <p>
            The feed works from the keyboard, Vim-style, as soon as it opens: <code>j</code> and{" "}
            <code>k</code> move, <code>gg</code> and <code>G</code> jump to the newest and last
            note, <code>o</code> or Enter opens, <code>p</code> pins, <code>/</code> searches and Escape goes back to your open notes.
          </p>
          <p>
            With no vault open, the feed is where you start. Until you&apos;ve given a name, it asks
            what to call you; press Enter and the greeting uses it. Under that are your recent
            vaults, then <strong>Open Vault</strong>, <strong>Create Vault</strong> and{" "}
            <strong>Browser Vault</strong>, or you can skip the vault: <strong>New Note</strong>{" "}
            opens a blank draft and <strong>Open File…</strong> opens a file from your device. Once
            a vault is open, your notes appear here.
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
              { label: "Come back to the feed", value: "Home at the top of the sidebar, or the Open Home command" },
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
          <p>
            A vault always opens on the feed, with the notes you had open last time waiting behind
            it. The bar at the top names the open vault and where it lives (a folder on this
            device, this browser or GitHub; on a phone, just the name). Click the name for the
            vault menu: your five most recent other vaults, then <strong>Open vault…</strong>,{" "}
            <strong>Create vault…</strong> and <strong>Browser vaults…</strong>, then{" "}
            <strong>Refresh vault</strong> and <strong>Close vault</strong>. A folder on your device
            may ask for access again when you switch back to it.
          </p>
          <p>
            <strong>Close vault</strong> disconnects the vault after you confirm, and the feed becomes the
            start screen, with your recent vaults listed so you can reopen one with a click. The{" "}
            <strong>×</strong> next to a recent vault removes it from the list; its notes stay
            where they are.
          </p>
        </>
      ),
    },
    {
      id: "editor-layout",
      title: "Editor layout",
      lead: "A full-screen editor with a slim header. Everything else is in the command palette and a few dedicated views.",
      keywords: "files show files search views tags tasks settings theme pane split toolbar sidebar command palette",
      body: (
        <>
          <p>
            There's no formatting toolbar above the text. Formatting happens through Markdown syntax,
            keyboard shortcuts, and the slash command menu.
          </p>
          <p>
            The toolbar at the top shows your open notes as tabs, even when only one is open. Each pane keeps
            up to 20 open: opening another closes the one you looked at least recently, never one with unsaved
            changes. On the left:
            the <strong> Sidebar</strong> button, while the sidebar is hidden. On the right: Save, Search (the
            command palette) and AI Chat (when an AI key is set). The <strong>&hellip; More</strong> menu holds Copy
            Markdown, Export as PDF, Settings and Help — every one of them is also in the command palette.
          </p>
          <p>
            Toolbar buttons are icons; hover one to see its name and shortcut.
          </p>
          <p>
            The <strong>sidebar</strong> starts with Home and lists your open notes across every pane. With a vault it adds
            Templates and Tasks below Home, and ends with <strong>Files</strong>, the vault&apos;s tree. Show
            it with the Sidebar button at the toolbar's far left and hide it with the button in its own header, or toggle it with{" "}
            <code>CTRL/CMD+ALT+S</code> or the <strong>Toggle Sidebar</strong>{" "}
            command, and drag its edge to resize it (double-click the edge to
            reset; with the edge focused, the arrow keys resize it too). Folded sections stay folded.
          </p>
          <p>
            <strong>Show Files</strong> (<code>CTRL/CMD+SHIFT+E</code>, or <code>CTRL/CMD+B</code>{" "}
            when the cursor isn&apos;t in a note, where it means Bold) shows the sidebar if it&apos;s hidden and puts the
            keyboard in Files, ready to browse, rename, move or delete. On a phone, where there&apos;s no sidebar, it opens
            Files full screen. Tasks has its own view; file search, tags, and headings are available through the command palette.
          </p>
          <p>
            Files offers the same actions everywhere, in the same order:{" "}
            <strong>New Note</strong> and <strong>New Folder</strong>, at the top and in every folder&apos;s
            right-click (or ⋯) menu. To start from a template, type <code>/template</code> in the new note.
            There&apos;s no Refresh button: files
            you add, delete or move outside HermesMarkdown show up on their own (straight away in Chrome and Edge,
            otherwise when you come back to the window).
          </p>
          <KV
            rows={[
              { label: "Home feed", value: "Home in the sidebar / Open Home command" },
              { label: "Sidebar", value: "Show: Sidebar button at the toolbar's far left / Hide: button in the sidebar's header / CTRL/CMD+ALT+S" },
              { label: "Show Files", value: "The sidebar's Files (full screen on a phone) / CTRL/CMD+SHIFT+E" },
              { label: "Quick switcher", value: "CTRL/CMD+K or CTRL/CMD+P" },
              { label: "Command palette", value: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
              { label: "Search note text", value: "CTRL/CMD+SHIFT+F" },
              { label: "Palette modes", value: "# vault tags · > commands · ! tasks · @ current-note headings · / note text" },
              { label: "Commands on or off", value: "The > button in the search field" },
              { label: "Files controls", value: "New note, new folder, and file actions" },
              { label: "AI Chat", value: "CTRL+SHIFT+B" },
              { label: "Keyboard shortcuts", value: "Show Keyboard Shortcuts command" },
            ]}
          />
          <p>
            Open several files side by side: run <strong>Split Pane Right</strong> from the command palette (or <strong>Open in pane</strong> on a tab),
            drag tabs between panes, and resize with the divider.
          </p>
          <p>
            To be alone with the text, set{" "}
            <a href="#focus" className="text-accent hover:underline">Focus</a> under Settings →
            Editor: the toolbar, tabs and sidebar fade while you type and come back when you move the mouse.
          </p>
        </>
      ),
    },
    keyboardShortcutsItem,
  ],
};
