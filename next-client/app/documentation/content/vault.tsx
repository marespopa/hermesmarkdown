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
            into a note, and the hidden <code>.hermes/trash/</code>, which holds what you delete
            for 30 days.
          </p>
          <KV
            rows={[
              { label: "Folder on disk", value: "Chrome, Edge, Brave, Arc, Opera" },
              { label: "Browser vault", value: "Every modern browser, including Safari, Firefox, iPhone, iPad" },
              { label: "GitHub vault", value: "Every modern browser; syncs with a repository" },
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
            (or use its ⋯ button) for its actions, or empty space for <strong>New Note</strong> and{" "}
            <strong>New Folder</strong>. Empty folders always show, so you can set up a structure
            before filling it.
          </p>
          <p>
            New notes and folders, and renames, are named right in the list: type, then press{" "}
            <strong>Return</strong> or click away to keep the name, or <strong>Esc</strong> to back out.
          </p>
          <p>
            The folder path above a note is clickable: click a folder in it to see that folder&apos;s
            notes and subfolders right there. Click a subfolder to step in, the ← to step up, or a
            note to open it; type to filter. <strong>Show in Files</strong> opens the folder in the
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
            Deleting moves notes and folders to the vault&apos;s Trash (<code>.hermes/trash/</code>)
            instead of erasing them. The toast&apos;s <strong>Undo</strong> or CMD/CTRL+Z in the file
            tree puts them back; anything in the Trash is removed for good after 30 days. The Trash is
            never indexed, searched, exported or synced to GitHub. If an item can&apos;t be moved to the
            Trash, you&apos;re asked before it is deleted permanently.
          </Callout>
        </>
      ),
    },
    {
      id: "github-vaults",
      title: "GitHub vaults",
      lead: "Optionally keep a Markdown vault in a GitHub repository you control, with explicit commits instead of background uploads.",
      keywords: "github repository private branch commit sync push pull source control oauth",
      body: (
        <>
          <p>
            Choose <strong>Connect GitHub Vault</strong> when opening a vault. You can select a
            repository you can access or create a new private repository. HermesMarkdown imports
            Markdown files and files under <code>.hermes/</code>; other repository files are left
            outside the vault workspace.
          </p>
          <KV
            rows={[
              { label: "New repository", value: "Private" },
              { label: "Imported content", value: "*.md and .hermes/**" },
              { label: "Branch", value: "Repository default branch" },
              { label: "Credentials", value: "Encrypted HttpOnly session cookie" },
            ]}
          />
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Branches</h4>
          <p>
            A GitHub vault opens on the repository&apos;s default branch, commonly <code>main</code>.
            The branch remains fixed for that vault workspace.
            Branch switching and branch creation are not available in HermesMarkdown yet; create
            or select the desired default branch in GitHub before connecting it.
          </p>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Commit and sync</h4>
          <p>
            Save your notes, then use the command palette&apos;s{" "}
            <code>GitHub: Commit</code>, <code>GitHub: Push</code>, or <code>GitHub: Sync</code>{" "}
            command. All three create a commit directly on the connected branch, so there is no
            separate local Git staging area or push step.
          </p>
          <p>
            HermesMarkdown compares the branch head recorded when the vault was opened before
            updating it. If somebody else advances the branch, the app stops rather than silently
            overwriting their changes. Run <code>GitHub: Pull</code> to bring in their changes, then
            commit again.
          </p>
          <Callout type="note">
            <code>GitHub: Pull</code> merges remote changes with your local notes. Independent
            edits are combined automatically; overlapping edits are left as visible conflict
            markers, so neither version is silently replaced. Resolve those markers before your
            next commit and sync.
          </Callout>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Privacy and access</h4>
          <p>
            Connecting GitHub uses OAuth with the <code>repo</code> permission so the signed-in
            user can read and write repositories they own or can access. The access token stays
            server-side in an encrypted HttpOnly cookie and is never written to note files,
            IndexedDB, or client-side application state.
          </p>
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
            (both last until you reload). It never shows up in note text search (<code>/</code>) and
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
