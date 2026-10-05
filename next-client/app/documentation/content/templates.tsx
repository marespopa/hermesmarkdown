import { Callout, Code, KV, type Subsection } from "../doc-primitives";

const h4 = "text-lg font-bold tracking-tight !mb-2 !mt-0";

// Documentation content: Editor group, vault templates.
export const templatesItems: Subsection[] = [
  {
    id: "templates",
    title: "Templates",
    lead: "A template is a note you start other notes from. Fields like Today's date or Ask: Owner fill in each time you use it.",
    keywords: "template templates quick start empty note preview tpl snippet starter meeting notes spec report token field add field placeholder prompt question ask cursor clipboard date slug new note missing link folder new notes go in target_folder file_name new template create template",
    body: (
      <>
        <h4 className={h4}>Make a template</h4>
        <p>
          Run <strong>New template…</strong> from the command palette, pick a starter and give it a
          name:
        </p>
        <ul>
          <li><strong>Basic</strong>: a title, today&apos;s date and one question.</li>
          <li><strong>Meeting notes</strong>: agenda, decisions, action items, open questions, next steps.</li>
          <li><strong>Spec</strong>: author, status and version, then summary, objective, prerequisites, design, open questions and references.</li>
          <li><strong>Report</strong>: summary, findings, next steps and notes.</li>
        </ul>
        <p>
          Then edit it like any note. Changes apply the next time you use it.
        </p>
        <h4 className={h4}>Add fields</h4>
        <p>
          A field is a spot that fills itself in when the template is used. Press{" "}
          <strong>+ Add field</strong> in the line at the top of the template, or type{" "}
          <code>/field</code>, and pick one:
        </p>
        <KV
          rows={[
            { label: "Ask a question…", value: "Asks you each time, e.g. Owner. Questions you already ask are listed first, so reusing one fills in the same answer" },
            { label: "Today's date", value: "2026-10-05" },
            { label: "Current time", value: "14:30" },
            { label: "Weekday, Month name", value: "Monday, October" },
            { label: "Year, Month number, Day of the month", value: "2026, 10, 05" },
            { label: "Note title", value: "The new note's title" },
            { label: "Title as file name", value: "auth-spec" },
            { label: "Clipboard", value: "What you last copied" },
            { label: "Start typing here", value: "Where the caret lands" },
          ]}
        />
        <p>
          In a template, fields show as small labelled boxes. Click one to see what&apos;s really
          written in the file. If something won&apos;t fill in, such as a misspelled field, the
          line at the top tells you.
        </p>
        <h4 className={h4}>Where new notes go</h4>
        <p>
          The line at the top of a template also says <strong>New notes go in</strong>. Click the
          folder to pick another one, or to create one. By default, notes go to your New Notes
          folder.
        </p>
        <h4 className={h4}>Use a template</h4>
        <ul>
          <li>
            <strong>Start from an empty note:</strong> a new, empty note shows your templates as
            small buttons under the first line. Click one to fill the note. They disappear as soon
            as you type.
          </li>
          <li>
            <strong>New note from template…</strong> in the command palette: pick a template, type a
            title, answer its questions, and the note opens.
          </li>
          <li>
            <strong><code>/template</code></strong> in a note: inserts a template where you&apos;re
            typing. The list shows what each template contains (like &quot;3 sections • Action
            items&quot;) and a preview of the highlighted one. Press ⌘1–⌘9 (Ctrl+1–9) to pick one
            straight away.
          </li>
          <li>
            <strong>Clicking a link to a note that doesn&apos;t exist yet</strong>, like{" "}
            <code>[[rfcs/auth-spec]]</code>: pick a template (or a blank note) for it. A template
            named after the folder, like <code>rfc</code>, is suggested first.
          </li>
        </ul>
        <Callout type="note">
          Existing notes are never overwritten: if the note is already there, it opens as is.
        </Callout>
        <h4 className={h4}>Under the hood</h4>
        <p>
          Templates are the <code>.md</code> files in your templates folder (the first of{" "}
          <code>templates/</code>, <code>_templates/</code> or <code>Templates/</code>, or the one
          set in Settings → Files → Templates Folder). They stay plain text: a field is written{" "}
          <code>{"{{date}}"}</code>, a question <code>{"{{prompt:Owner}}"}</code>, and the folder
          is a <code>target_folder</code> line in the frontmatter. You can also type these by hand.
          Typing <code>{"{{"}</code> opens the same field list. An optional{" "}
          <code>file_name</code> line names new notes, and fields work in it too:
        </p>
        <Code>
          {"---\ntarget_folder: rfcs\nfile_name: rfc-{{date}}-{{slug}}\n---\n# {{title}}\nOwner: {{prompt:Owner}}\n{{cursor}}"}
        </Code>
        <p>
          Other frontmatter lines (author, status, …) are copied into each new note. Templates
          stay out of the Tasks page and the home feed. AI Chat can write templates for you; see{" "}
          <a href="#ai-templates" className="text-sage font-semibold hover:underline">AI templates</a>.
        </p>
      </>
    ),
  },
];
