import { Callout, Code, KV, type Subsection } from "../doc-primitives";

const h4 = "text-[19px] font-semibold tracking-tight !mb-2 !mt-0";

// Documentation content: Editor group, after Templates. The Templates page
// and template packs, including dated notes (a journal) made from them.
export const templatePacksItem: Subsection = {
  id: "template-packs",
  title: "Template packs",
  lead: "Keep your templates in packs, add the ones HermesMarkdown ships, and start a journal from a template.",
  keywords:
    "template packs templates page manage edit duplicate delete pack folder journal daily weekly monthly yearly diary dated note today week month year meetings writing projects add to vault reuse",
  body: (
    <>
      <p>
        Open <strong>Templates</strong> from the sidebar, or run <strong>Open Templates</strong> from
        the command palette. The page lists every template in your vault and the packs you can add.
      </p>
      <h4 className={h4}>Your templates</h4>
      <p>
        A pack is a folder inside your templates folder, like <code>templates/Journal/</code>. Templates
        directly in the templates folder are listed first, as loose templates. For each template:
      </p>
      <KV
        rows={[
          { label: "Use", value: "Make a note from it and open it in the editor" },
          { label: "Edit", value: "Open the template itself; changes apply the next time you use it" },
        ]}
      />
      <p>
        Each pack has <strong>New</strong> (a template in that pack), <strong>Duplicate</strong> (copy the
        pack under a new name, to change it without touching the original) and <strong>Delete</strong>{" "}
        (move it to the Trash, with Undo). <strong>New pack</strong> at the top makes an empty one. Packs
        are ordinary folders, so you can also rename or move them in the file tree, sync them, or copy one
        into another vault to reuse it there.
      </p>
      <h4 className={h4}>Packs to add</h4>
      <KV
        rows={[
          { label: "Journal", value: "Daily, Weekly, Monthly, Yearly and Log entry" },
          { label: "Meetings", value: "Meeting notes, One-on-one, Standup" },
          { label: "Writing", value: "Draft, Outline" },
          { label: "Projects", value: "Project brief, Spec, Report" },
        ]}
      />
      <p>
        <strong>Add to vault</strong> copies a pack&apos;s templates into your templates folder as files
        you own. A file you already have is never replaced: the button says how many are missing, and{" "}
        <strong>Added</strong> once you have them all.
      </p>
      <h4 className={h4}>A journal from templates</h4>
      <p>
        HermesMarkdown has no daily sheet of its own: a dated page is just a note a template names. The
        Journal pack&apos;s <strong>Daily</strong> template starts like this:
      </p>
      <Code>{"---\ntarget_folder: journal/{{year}}\nfile_name: {{date}}\n---\n# {{date:dddd, D MMMM}}"}</Code>
      <p>
        Using it makes <code>journal/2026/2026-10-12.md</code>. Because its <code>file_name</code>{" "}
        doesn&apos;t use the title, no title is asked for, and using it again the same day opens the page
        you already started instead of making another. <strong>Weekly</strong>, <strong>Monthly</strong>{" "}
        and <strong>Yearly</strong> work the same way with <code>{"{{weekSheet}}"}</code> (
        <code>2026-W42</code>), <code>{"{{monthSheet}}"}</code> (<code>2026-10</code>) and{" "}
        <code>{"{{yearSheet}}"}</code> (<code>2026-year</code>). Change the folder or the names in the
        template to suit yourself.
      </p>
      <Callout type="note">
        Sheets you made with earlier versions (like <code>2026-10-09.md</code> or{" "}
        <code>2026-W41.md</code>) are still ordinary notes in your vault. Nothing was moved or changed.
      </Callout>
    </>
  ),
};
