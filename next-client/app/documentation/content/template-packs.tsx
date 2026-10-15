import { Code, KV, type Subsection } from "../doc-primitives";

const h4 = "text-[19px] font-semibold tracking-tight !mb-2 !mt-0";

// Documentation content: Editor group, after Templates. The Templates page
// and template packs, including a journal kept with them.
export const templatePacksItem: Subsection = {
  id: "template-packs",
  title: "Template packs",
  lead: "Keep your templates in packs, add the ones HermesMarkdown ships, and keep a journal with them.",
  keywords:
    "template packs templates page manage edit duplicate delete pack folder journal daily weekly monthly yearly diary dated note today week month year meetings writing book note projects prd requirements engineering readme adr decision record finance budget expenses savings subscriptions money table formulas add to vault reuse",
  body: (
    <>
      <p>
        Open <strong>Templates</strong> from the sidebar, or run <strong>Open Templates</strong> from
        the command palette. The page lists every template in your vault and the packs you can add.
      </p>
      <h4 className={h4}>Your templates</h4>
      <p>
        Templates live in <code>templates/</code> at the root of your vault. A pack is a folder inside
        it, like <code>templates/Journal/</code>; templates directly in <code>templates/</code> are listed
        first, under <strong>Not in a pack</strong>. <strong>Edit</strong> opens a template itself; changes
        apply the next time you use it. <strong>Delete</strong> moves one template to the Trash, with
        Undo. To use a template, type <code>/template</code> in a note, pick one from an
        empty note&apos;s buttons, or from a link to a note that doesn&apos;t exist yet.
      </p>
      <p>
        Each pack has <strong>New</strong> (a template in that pack), <strong>Duplicate</strong> (copy the
        pack under a new name, to change it without touching the original) and <strong>Delete</strong>{" "}
        (move it to the Trash, with Undo). <strong>New pack</strong> at the top makes an empty one. Packs
        are ordinary folders, so you can also rename or move them in Files, sync them, or copy one
        into another vault to reuse it there.
      </p>
      <h4 className={h4}>Packs to add</h4>
      <KV
        rows={[
          { label: "Journal", value: "Daily, Weekly, Monthly, Yearly and Log entry" },
          { label: "Meetings", value: "Meeting notes, One-on-one, Standup" },
          { label: "Writing", value: "Draft, Outline, Book note" },
          { label: "Projects", value: "Project brief, PRD, Spec, Report" },
          { label: "Engineering", value: "README, Decision record" },
          { label: "Finance", value: "Monthly budget, Expense log, Savings goals, Subscriptions" },
        ]}
      />
      <p>
        <strong>Add to vault</strong> copies a pack&apos;s templates into <code>templates/</code> as files
        you own. A file you already have is never replaced: the button says how many are missing, and{" "}
        <strong>Added</strong> once you have them all.
      </p>
      <p>
        The Finance templates are tables with formulas: type amounts over the zeros and the totals
        update. The monthly budget&apos;s summary adds up its Income and Expenses tables by name, so add
        or remove rows freely; in Savings goals and Subscriptions, copy a row&apos;s formula when you add
        one.
      </p>
      <h4 className={h4}>A journal from templates</h4>
      <p>
        HermesMarkdown has no daily sheet of its own: a dated page is just a note you name by date. The
        Journal pack&apos;s <strong>Daily</strong> template starts like this:
      </p>
      <Code>{"# {{date:dddd, D MMMM}}"}</Code>
      <p>
        Create a note named by date, like <code>journal/2026-10-12</code> (or click a link to it), and
        pick <strong>Daily</strong>: it&apos;s suggested first for a date. Or type{" "}
        <code>/template</code> in an empty note. <strong>Weekly</strong> and <strong>Monthly</strong>{" "}
        link the one before with date formats, like <code>{"[[{{date-1w:GGGG-[W]ww}}]]"}</code>{" "}
        (last week&apos;s <code>2026-W41</code>). Change the templates to suit yourself.
      </p>
    </>
  ),
};
