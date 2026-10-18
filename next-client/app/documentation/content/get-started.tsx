import { Callout, KV, type Group } from "../doc-primitives";
import { keyboardShortcutsItem } from "./keyboard-shortcuts";
import TextLink from "@/app/components/TextLink";

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
            <TextLink href="#browser-vaults">browser vault</TextLink>.
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
            <TextLink href="#browser-vaults">a browser vault</TextLink>{" "}
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
            HermesMarkdown creates the folder and opens the vault, with its files in the sidebar.
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
            Press <code>CTRL+ALT+N</code>, click <strong>New note</strong> at the top of the sidebar, or
            choose <strong>New Note</strong> from the command palette. A blank note opens, ready to type,
            with no name prompt.
          </p>
          <p>
            The first time you open HermesMarkdown there is nothing to set up: you land in the
            editor on a blank note, ready to type. Once it has text, a bar
            at the bottom asks where your notes live. <strong>Choose Folder…</strong> picks a folder (you can make a new one in the
            picker) and saves the note there; in browsers that can&apos;t open folders it reads{" "}
            <strong>Keep Notes in This Browser</strong> and creates a{" "}
            <TextLink href="#browser-vaults">browser vault</TextLink>.{" "}
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
            <TextLink href="#frontmatter">Frontmatter</TextLink>.
            Autosave can be changed under{" "}
            Settings → Files → Autosave: <strong>After Delay</strong> (the default, two seconds after
            you stop typing) or{" "}
            <strong>Manual Only</strong>. With autosave set to manual, a new note is saved only when you
            press <code>CTRL/CMD+S</code>. To get a copy of a note outside your vault, run{" "}
            <strong>Export as Markdown</strong>: it always downloads the note as a <code>.md</code> file
            and never changes the saved note.
          </p>
        </>
      ),
    },
    {
      id: "pinned-notes",
      title: "Pinned notes",
      lead: "Keep the notes you come back to at hand: first in the command palette and at the top of Files.",
      keywords: "pin pinned unpin favorite favourite top quick access palette files sidebar",
      body: (
        <>
          <p>
            To pin a note, right-click it in the sidebar&apos;s <strong>Files</strong> and choose{" "}
            <strong>Pin</strong>, choose <strong>Pin Note</strong> in the note&apos;s right-click menu (on the button at
            the top of the page), run <strong>Pin Note</strong>{" "}
            from the command palette, or press <code>CTRL/CMD+D</code> on it in the palette. Pinned notes
            are listed first, newest pin first, at the top of <strong>Files</strong> and in the command
            palette before you type anything. The same places unpin it. Each vault keeps its own pins;
            a pinned note that&apos;s renamed or moved stays pinned.
          </p>
          <p>
            In the palette you can pin commands too (<code>CTRL/CMD+D</code> on a command, up to five);
            those are the palette&apos;s own.
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
            There&apos;s no toolbar. A quiet header sits at the top left of the page: the note&apos;s folder (a deep one
            shows its first and last folders, with the rest folded into …), and its name. It stays
            put while you type. A dot after the name shows the save state: grey while the note has unsaved
            changes, pulsing while it saves, red if it couldn&apos;t save. With autosave on it stays hidden while
            autosave is about to save, and shows only if a save runs late or fails. Hover the dot for the save
            button and click it to save, or to try again. Click the name to rename the note in
            place: press <code>Enter</code> or click away to keep the new name, <code>Esc</code> to back out. The
            search bar in the top-right corner (or <code>CTRL/CMD+K</code>) opens the command palette, where every note
            and command is: Save, Copy Markdown, Export as PDF or HTML, Pin Note, Settings, Documentation, Ask or Edit with AI and the rest.
            Each pane keeps up to 20 notes
            open behind the one in front, listed in the sidebar&apos;s Open Notes: opening another closes the
            one you looked at least recently, never one with unsaved changes, and <code>CTRL/CMD+1–9</code>{" "}
            jumps between them (each of the first nine shows its shortcut there). Right-click a note there, or
            the note&apos;s name at the top, for its menu: Copy Markdown, Open in pane, Pin Note, Rename…, Move
            to Trash, and Close, Close Others or Close All. While the sidebar is hidden, its button sits in the top-left corner.
          </p>
          <p>
            <strong>Search</strong> is the way around: the search bar in the editor&apos;s top-right corner, the same one at
            the top of every page, or <code>CTRL/CMD+K</code> anywhere, opens the command palette to find a note, run a command or go to
            a page: Home, All Notes, Tags, Tasks, Templates, Trash or Settings. <code>CTRL/CMD+SHIFT+F</code>{" "}
            searches the text of your notes. Every page has{" "}
            <strong>← Editor</strong> at the top left to come back to the note you were on.
          </p>
          <p>
            The <strong>sidebar</strong> is your library, the same on every editor page: its header names the
            vault (click it to switch to a recent vault or open another) beside <strong>New note</strong> and the
            button that hides it; below come <strong>Open Notes</strong> (the notes open in the pane you&apos;re in:
            click one to switch to it, or its × to close it; a dot marks unsaved changes), the{" "}
            <strong>Outline</strong> of the note in front (click a heading to jump to it) and <strong>Files</strong>,
            the vault&apos;s tree. A line sets each section apart, and each has a chevron to fold or unfold it.
            It sits beside the page and pushes it over rather than covering it.
          </p>
          <p>
            Show it with the Sidebar button at the top left and hide it with the button in its own header, Escape
            inside it, or toggle it with <code>CTRL/CMD+\</code>, <code>CTRL/CMD+ALT+S</code> or the{" "}
            <strong>Toggle Sidebar</strong> command, and drag its edge to resize it (double-click the edge to
            reset; with the edge focused, the arrow keys resize it too). Folded sections stay folded.
          </p>
          <p>
            Every place has its own address, so a refresh or a bookmark brings you back to it: the note in front
            (<code>/editor?file=notes/plan.md</code>), Tasks, Templates, Trash, All Notes, a tag on the Tags page, and each
            Settings section.
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
              { label: "Sidebar", value: "Show: Sidebar button at the top left / Hide: button in the sidebar's header or Escape / CTRL/CMD+\\ or CTRL/CMD+ALT+S" },
              { label: "Show Files", value: "The sidebar's Files (full screen on a phone) / CTRL/CMD+SHIFT+E" },
              { label: "Quick switcher", value: "CTRL/CMD+K or CTRL/CMD+P" },
              { label: "Command palette", value: "CTRL/CMD+SHIFT+K or CTRL/CMD+SHIFT+P" },
              { label: "Search note text", value: "CTRL/CMD+SHIFT+F" },
              { label: "Palette modes", value: "# vault tags · > commands · ! tasks · @ current-note headings · / note text" },
              { label: "Commands on or off", value: "The > button in the search field" },
              { label: "Files controls", value: "New note, new folder, and file actions" },
              { label: "Ask or Edit with AI…", value: "CTRL/CMD+J" },
              { label: "AI Chat", value: "CTRL+SHIFT+B" },
              { label: "Keyboard shortcuts", value: "Show Keyboard Shortcuts command" },
            ]}
          />
          <p>
            Open several files side by side: run <strong>Split Pane Right</strong> from the command palette (or <strong>Open in pane</strong> in the title&apos;s right-click menu),
            and resize with the divider. Each pane has its own title.
          </p>
          <p>
            To be alone with the text, close the sidebar (<code>CTRL/CMD+\</code>); it stays how you leave
            it. See{" "}
            <TextLink href="#focus">Focus</TextLink> to dim everything but the paragraph you&apos;re writing.
          </p>
        </>
      ),
    },
    keyboardShortcutsItem,
  ],
};
