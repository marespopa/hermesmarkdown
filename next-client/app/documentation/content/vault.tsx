import { Callout, Code, KV, type Group } from "../doc-primitives";
import TextLink from "@/app/components/TextLink";

// Documentation content: Vault group.
export const vaultGroup: Group = {
  id: "vault",
  label: "Vault",
  items: [
    {
      id: "vault-overview",
      title: "Vault overview",
      lead: "A vault is a folder. HermesMarkdown reads and writes plain Markdown files in it and otherwise leaves it alone.",
      keywords: "directory structure plain files lock-in",
      body: (
        <>
          <p>
            Any folder you open becomes a vault. Subfolders, file names, and organization are entirely
            yours — HermesMarkdown doesn't enforce a structure or move files around.
          </p>
          <Code>{`my-vault/
  projects/         ← yours
    roadmap.md
  daily/            ← yours
    2026-06-25.md`}</Code>
          <p>
            Every note is a plain <code>.md</code> file, optionally with a YAML frontmatter block. Open
            the folder in any other editor, sync it with Dropbox or Google Drive, or move it to another
            machine — nothing about it depends on HermesMarkdown being installed. The only folders
            HermesMarkdown creates on its own are <code>assets/</code>, for images you paste or drop
            into a note, and the hidden <code>.hermesmarkdown/trash/</code>, which holds what you delete
            for 30 days. What you pin to the sidebar is kept in this browser, not in the vault.
          </p>
          <KV
            rows={[
              { label: "Folder on disk", value: "Chrome, Edge, Brave, Arc, Opera" },
              { label: "Browser vault", value: "Every modern browser, including Safari, Firefox, iPhone, iPad" },
            ]}
          />
          <p>
            A{" "}
            <TextLink href="#browser-vaults">browser vault</TextLink>{" "}
            holds the same plain files, just inside the browser&apos;s private storage instead of a
            folder you can see. Nothing is locked in: <strong>Export vault as zip</strong> hands you
            every file, and <strong>Import files into vault…</strong> brings a zip or folder into any
            vault.
          </p>
        </>
      ),
    },
    {
      id: "organizing-files",
      title: "Organizing files",
      lead: "Files, in the sidebar or on the mobile Files page, works like a Finder list: select, drag, rename in place, and undo.",
      keywords: "folders rename move delete trash undo select drag keyboard shortcuts empty folder breadcrumb path",
      body: (
        <>
          <p>
            Click a row to select it, <strong>CMD/CTRL</strong>-click to add or remove rows, and{" "}
            <strong>Shift</strong>-click to select a range. Drag a selected row onto a folder to move
            the whole selection; hovering a closed folder while dragging opens it. Right-click a row
            (or use its ⋯ button) for its actions, or empty space for <strong>New File</strong> and{" "}
            <strong>New Folder</strong>. Empty folders always show, so you can set up a structure
            before filling it.
          </p>
          <p>
            Files shows every file by its full name, extension included. Besides your notes it lists
            the vault&apos;s other text files (code, JSON, YAML, CSV, plain text…); see{" "}
            <TextLink href="#code-files">Code files</TextLink>.
            A note&apos;s <code>type:</code> in its frontmatter (or a <code>#type/…</code> tag) picks its
            icon: project, task, meeting or bookmark.
          </p>
          <p>
            New files and folders, and renames, are named right in the list: type, then press{" "}
            <strong>Return</strong> or click away to keep the name, or <strong>Esc</strong> to back out.
          </p>
          <p>
            The folder path above a file is clickable: click a folder in it to see that folder&apos;s
            files and subfolders right there. Click a subfolder to step in, the ← to step up, or a
            file to open it; type to filter. <strong>Show in Files</strong> opens the folder in the
            sidebar.
          </p>
          <KV
            rows={[
              { label: "↑ / ↓", value: "Move the selection (Shift extends it)" },
              { label: "→ / ←", value: "Open or close a folder; step in or out" },
              { label: "Return (Mac) / F2", value: "Rename" },
              { label: "CMD+O or CMD+↓ (Mac) / Enter", value: "Open" },
              { label: "CMD+Backspace (Mac) / Delete", value: "Move to Trash" },
              { label: "CMD/CTRL+Z", value: "Undo the last rename, move or move to Trash" },
              { label: "CMD/CTRL+A", value: "Select all" },
            ]}
          />
          <Callout type="note">
            Deleting moves files and folders to the vault&apos;s Trash (<code>.hermesmarkdown/trash/</code>)
            instead of erasing them. The toast&apos;s <strong>Undo</strong> or CMD/CTRL+Z in the file
            tree puts them back; anything in the Trash is removed for good after 30 days. The Trash is
            never indexed, searched or exported. If an item can&apos;t be moved to the
            Trash, you&apos;re asked before it is deleted permanently.
          </Callout>
        </>
      ),
    },
    {
      id: "code-files",
      title: "Code files",
      lead: "Code and other text files in the vault open in the same editor, as plain text with code editing.",
      keywords: "code files source text json yaml typescript javascript python dockerfile makefile line numbers brackets fold format prettier search grep outline symbols functions classes methods fields constants enums c# csharp rust",
      body: (
        <>
          <p>
            Files with a code or text extension (<code>.ts</code>, <code>.py</code>,{" "}
            <code>.json</code>, <code>.yaml</code>, <code>.sh</code>, <code>.txt</code>…) and known
            names (<code>Dockerfile</code>, <code>Makefile</code>, <code>LICENSE</code>, and with hidden
            files shown, <code>.gitignore</code> or <code>.editorconfig</code>) open as plain text in the
            code font, with no Markdown rendering. Their lines are always numbered. When the language is
            recognized, it&apos;s highlighted, brackets are matched, typing an opening bracket or quote
            adds its pair, and blocks fold from the gutter. With <strong>Outline</strong> on
            (<code>CTRL/CMD+SHIFT+M</code>), its box lists the file&apos;s namespaces and modules,
            classes, structs and their methods, fields and properties, functions, types, enums and their
            members, top-level constants and variables (in Python, only <code>ALL_CAPS</code> ones), a JavaScript <code>export default</code>, CSS
            selectors, or JSON and YAML keys, each with a small icon for its kind (C# included); click one
            to jump there. They stay out of All Files, tags and tasks;{" "}
            <code>.env</code> files are never listed.
          </p>
          <p>
            Quick Open (<code>CTRL/CMD+K</code>) finds them by name. To create one, type its name with
            the extension (<code>util.ts</code>) in <strong>New File</strong>; renaming a file to a code
            file name drops <code>.md</code>.
          </p>
          <KV
            rows={[
              { label: "Format Code", value: "SHIFT+ALT+F or the palette: the whole file, or a note's code block" },
              { label: "Formats", value: "JavaScript, TypeScript, JSON, CSS, SCSS, Less, HTML, Vue, YAML, GraphQL" },
              { label: "Search inside", value: "Settings → Files → Search Code Files, then / in the palette" },
            ]}
          />
          <p>
            Format Code uses Prettier with the vault&apos;s own settings: the nearest{" "}
            <code>.prettierrc</code>, <code>.prettierrc.json</code>, <code>.prettierrc.yaml</code> or{" "}
            <code>package.json</code> <code>&quot;prettier&quot;</code> key, from the file&apos;s folder
            up to the vault root, with matching <code>overrides</code>. A JavaScript config such as{" "}
            <code>prettier.config.js</code> can&apos;t run in the browser, so Prettier&apos;s defaults are
            used and the toast says so.
          </p>
          <Callout type="note">
            Code files aren&apos;t kept in the text index. With Search Code Files on, the first{" "}
            <code>/</code> search reads them from disk in the background and keeps them, so later
            searches are instant until a file changes. Their matches follow the notes&apos; as they
            come in.
          </Callout>
        </>
      ),
    },
    {
      id: "git",
      title: "Using git",
      lead: "HermesMarkdown doesn't run git: commit, pull and push with the tools you already use. It can show what changed since your last commit.",
      keywords: "git github gitlab repository commit sync push pull source control version history diff changes inline status review",
      body: (
        <>
          <p>
            A vault on disk is a plain folder of Markdown files, so it can be a git repository (or a
            folder inside one). Commit, pull and push from a terminal or a git app as usual. The{" "}
            <code>.git</code> folder, <code>node_modules</code> and other tool folders are never listed
            or indexed.
          </p>
          <p>
            Turn on <strong>Git Changes</strong> (the button in the editor's top-right corner, the
            command palette, or Settings → Editor → View) to see what you have changed since the last
            commit, the way a pull request shows it. Added and changed lines are tinted green and marked
            with a +; the old lines they replaced, and lines you deleted, show above them on a red tint,
            marked with a −, and can't be edited. The diff updates as you type, and again after you commit
            in another tool. <strong>Next Git change</strong> (Alt+F5) and <strong>Previous Git
            change</strong> (Shift+Alt+F5), also in the palette, jump between the changes. It shows only when
            the <code>.git</code> folder is at the root of the vault you opened, and a file that isn't
            committed yet is marked as all added. HermesMarkdown only reads <code>.git</code>; it never
            runs git or writes to it.
          </p>
          <p>
            <strong>Show Changes</strong> (command palette) opens a page that lists every file changed
            since the last commit, with its diff, like the file list of a pull request: a summary of how
            many files changed and how many lines were added and removed, then one section per file that
            you can collapse. Long unchanged stretches are folded; click one to show it. Files matched
            by <code>.gitignore</code>, tool folders and secret files are left out. Click a file&apos;s
            name, or a line, to open the file there. It compares the files saved on disk, not unsaved
            edits, refreshes when you return to the window, and only reads the <code>.git</code> folder at
            the root of the vault.
          </p>
          <p>
            When a pull changes a file you have open, the editor picks up the new text; if you have
            unsaved edits in that file, the conflict dialog lets you keep, take or merge the versions.
          </p>
          <Callout type="note">
            HermesMarkdown used to sync GitHub vaults itself. A GitHub vault from that time opens as a
            browser vault with the same name and files. Export it as a zip, or copy the files into a
            cloned repository, to keep using git with them.
          </Callout>
        </>
      ),
    },
    {
      id: "frontmatter-conventions",
      title: "Frontmatter conventions",
      lead: "Frontmatter is optional and free-form. A few fields are read by the app.",
      keywords: "title tags scope read_when metadata",
      body: (
        <>
          <KV
            rows={[
              { label: "title", value: "string · optional" },
              { label: "tags", value: "list · optional" },
              { label: "private", value: "true · optional" },
              { label: "Anything else", value: "Kept as-is" },
            ]}
          />
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">title</h4>
          <p>A display title for the note. Notes save fine without it — the file name is the identifier.</p>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">tags</h4>
          <p>
            Free-form tags. Together with inline <code>#tags</code>, they feed the palette&apos;s{" "}
            <code>#</code> mode.
          </p>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">private</h4>
          <p>
            <code>private: true</code>, or a <code>private</code> tag, marks a note as{" "}
            <TextLink href="#private-notes">private</TextLink>.
          </p>
        </>
      ),
    },
    {
      id: "private-notes",
      title: "Private notes",
      lead: "Keep notes with revenue figures, keys or personal details off the screen while you share or record it.",
      keywords: "private mark as private mark as public /privacy public privacy mode screen share recording hide mask lock reveal",
      body: (
        <>
          <p>
            A note is private when its frontmatter says so, so the marker travels with the plain
            Markdown file. Either form works:
          </p>
          <Code>{`---
private: true
---

or

---
tags: [finance, private]
---`}</Code>
          <p>
            Or type <code>/privacy</code> in a note: <strong>Privacy: mark as private</strong> adds{" "}
            <code>private: true</code>; on a private note, <strong>Privacy: mark as public</strong>{" "}
            removes it and the <code>private</code> tag. An inline <code>#private</code> in the body
            doesn&apos;t count.
          </p>
          <p>
            A private note opens behind a veil showing only its title, until you choose{" "}
            <strong>Show note</strong> or <strong>Show all private notes this session</strong>{" "}
            (both last until you reload). It never shows up in text search (<code>/</code>) and
            is never sent to AI. In lists, <strong>Privacy Mode</strong> decides; set it under{" "}
            <strong>Settings → Files → Privacy</strong> or with the <code>Privacy mode: …</code>{" "}
            commands:
          </p>
          <KV
            rows={[
              { label: "Mask in lists (default)", value: "Pinned notes, quick open and Tasks show the title with a lock; preview and task text are bullets" },
              { label: "Hide from lists", value: "Left out of pinned notes, quick open and Tasks" },
            ]}
          />
          <Callout type="note">
            <ul>
              <li>This is screen privacy, not encryption: the file stays readable on disk.</li>
              <li>File names still show in Files and in the editor title. A new note is named after its first line, so give a private note a harmless first line.</li>
            </ul>
          </Callout>
        </>
      ),
    },
  ],
};
