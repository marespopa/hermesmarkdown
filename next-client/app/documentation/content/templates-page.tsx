import { KV, type Subsection } from "../doc-primitives";

const h4 = "text-[19px] font-semibold tracking-tight !mb-2 !mt-0";

// Documentation content: Editor group, after Templates. The Templates page:
// making your own templates, packs, folder templates and the examples.
export const templatesPageItem: Subsection = {
  id: "templates-page",
  title: "Templates page",
  lead: "Make your own templates with New template, keep them in packs, and start from an example when you like.",
  keywords:
    "templates page manage edit duplicate delete new template wizard pack packs folder folder template examples example meeting notes project brief project folder research folder start from this reuse",
  body: (
    <>
      <p>
        Open <strong>Templates</strong> from the sidebar, or run <strong>Open Templates</strong> from
        the command palette. The page is about the templates you make: <strong>New template</strong>{" "}
        leads, your templates follow, then a few examples to start from. While an action runs, its
        button shows it&apos;s working and can&apos;t be pressed again.
      </p>
      <h4 className={h4}>New template</h4>
      <p>
        <strong>New template</strong> asks three things: a <strong>Note</strong> or a{" "}
        <strong>Folder</strong> template, its name, and what it starts from: blank, an example, or for a
        folder template a folder you already have. A note template can go in a pack: one of yours, or
        a new one you name right there. A folder template can ask for the new folder&apos;s name each
        time you use it. The template opens as soon as it&apos;s made, so you can shape it.
        Nothing you have is ever replaced.
      </p>
      <h4 className={h4}>Your templates</h4>
      <p>
        Templates live in <code>_templates/</code> at the root of your vault. A pack is a folder inside
        it, like <code>_templates/Work/</code>; templates directly in <code>_templates/</code> are listed
        first, under <strong>Not in a pack</strong>. <strong>Edit</strong> opens a template itself; changes
        apply the next time you use it. <strong>Delete</strong> moves it to the Trash, with Undo. To use
        a template, type <code>/template</code> in a note, pick one from an empty note&apos;s buttons, or
        from a link to a note that doesn&apos;t exist yet.
      </p>
      <p>
        Each pack has <strong>New</strong> (New template, already set to that pack),{" "}
        <strong>Duplicate</strong> (copy the pack under a new name, to change it without touching the
        original) and <strong>Delete</strong> (move it to the Trash, with Undo). Packs
        are ordinary folders, so you can also rename or move them in Files, sync them, or copy one
        into another vault to reuse it there.
      </p>
      <p>
        Your folder templates are listed after the packs, by name. <strong>Edit</strong> opens the
        folder&apos;s README; <strong>Delete</strong> moves the whole folder to the Trash.
      </p>
      <h4 className={h4}>Examples</h4>
      <KV
        rows={[
          { label: "Meeting notes", value: "A note: agenda, decisions, action items" },
          { label: "Project brief", value: "A note: goal, scope, milestones" },
          { label: "Project folder", value: "A folder: README, Tasks, Decisions and a Kickoff meeting" },
          { label: "Research folder", value: "A folder: README, Sources and Open questions" },
        ]}
      />
      <p>
        <strong>Start from this</strong> opens New template on that example, so the template you get
        is your own copy to change. The examples also work as they are, without copying: from{" "}
        <code>/template</code> and an empty note&apos;s buttons, and from{" "}
        <strong>New from folder template…</strong>.
      </p>
    </>
  ),
};
