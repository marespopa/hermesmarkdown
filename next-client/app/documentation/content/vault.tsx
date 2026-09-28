import { Callout, Code, KV, type Group } from "../doc-primitives";

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
            machine — nothing about it depends on HermesMarkdown being installed. The only folder
            HermesMarkdown creates on its own is <code>assets/</code>, for images you paste or drop
            into a note.
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
            <a href="#browser-vaults" className="text-sage font-semibold hover:underline">browser vault</a>{" "}
            holds the same plain files, just inside the browser&apos;s private storage instead of a
            folder you can see. Nothing is locked in: <strong>Export vault as zip</strong> hands you
            every file, and <strong>Import files into vault…</strong> brings a zip or folder into any
            vault.
          </p>
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
          <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">Branches</h4>
          <p>
            A GitHub vault opens on the repository&apos;s default branch, commonly <code>main</code>.
            The branch remains fixed for that vault workspace.
            Branch switching and branch creation are not available in HermesMarkdown yet; create
            or select the desired default branch in GitHub before connecting it.
          </p>
          <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">Commit and sync</h4>
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
          <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">Privacy and access</h4>
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
              { label: "Anything else", value: "Kept as-is" },
            ]}
          />
          <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">title</h4>
          <p>A display title for the note. Notes save fine without it — the file name is the identifier.</p>
          <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">tags</h4>
          <p>
            Free-form tags. Together with inline <code>#tags</code>, they feed the palette&apos;s{" "}
            <code>#</code> mode and Smart Workspace rules.
          </p>
          <p>
            Notes created with <strong>Generate new note with AI</strong> also get{" "}
            <code>status: draft</code>, plus <code>scope</code> and <code>read_when</code> fields
            describing what the note covers and when it&apos;s worth reading.
          </p>
        </>
      ),
    },
  ],
};
