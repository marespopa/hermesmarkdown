import { Callout, Code, KV, type Subsection } from "../doc-primitives";

// Documentation content: Editor group, vault templates.
export const templatesItems: Subsection[] = [
  {
    id: "templates",
    title: "Templates",
    lead: "Templates are ordinary Markdown files in a templates folder. Tokens like {{date}} fill in when you use one.",
    keywords: "template templates tpl snippet token field add field placeholder prompt cursor clipboard date slug new note missing link target_folder file_name new template create template",
    body: (
      <>
        <p>
          Every <code>.md</code> file directly in your templates folder is a template, named after
          its file. By default that&apos;s the first of <code>templates/</code>,{" "}
          <code>_templates/</code> or <code>Templates/</code> that exists. Pick another folder in
          Settings → Files → Templates Folder (saved per vault). Add, edit or delete a template like
          any note: changes apply the next time you use it, with no setup and no reload. Templates
          stay plain text, so other Markdown editors read them as normal notes. Their tasks stay
          off the Tasks page, and they don&apos;t appear in the home feed. Run{" "}
          <strong>New template…</strong> from the command palette to create one: name it, and it
          opens with a short example showing the frontmatter keys, <code>{"{{title}}"}</code>,{" "}
          <code>{"{{date}}"}</code>, a prompt and <code>{"{{cursor}}"}</code>. If a template with
          that name already exists, it opens unchanged.
        </p>
        <p>
          While you edit a template, you don&apos;t have to remember any token. Type{" "}
          <code>{"{{"}</code> or <code>/field</code>, or press <strong>+ Add field</strong> at the
          top of the note, to pick from every field with today&apos;s value or a short description.
          Prompts the template already asks for are listed first, so reusing one is a single pick.
          The line at the top also counts the fields the template asks for and warns about anything
          that won&apos;t expand, like a misspelled token.
        </p>
        <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-0">Tokens</h4>
        <KV
          rows={[
            { label: <code>{"{{date}}"}</code>, value: "2026-10-04" },
            { label: <code>{"{{time}}"}</code>, value: "14:30 (24 h)" },
            { label: <code>{"{{weekday}} {{monthName}}"}</code>, value: "Sunday October" },
            { label: <code>{"{{year}} {{month}} {{day}}"}</code>, value: "2026 10 04" },
            { label: <code>{"{{title}}"}</code>, value: "The note's title" },
            { label: <code>{"{{slug}}"}</code>, value: "auth-spec" },
            { label: <code>{"{{clipboard}}"}</code>, value: "Clipboard text" },
            { label: <code>{"{{cursor}}"}</code>, value: "Caret position" },
            { label: <code>{"{{prompt:Owner}}"}</code>, value: "Asks for a value" },
          ]}
        />
        <p>
          <code>{"{{title}}"}</code> is the new note&apos;s title, or the current note&apos;s title
          when you insert a template. <code>{"{{slug}}"}</code> is that title in URL-safe
          kebab-case. <code>{"{{clipboard}}"}</code> is empty if the browser doesn&apos;t allow
          reading it, and the clipboard is only read when a template uses it.{" "}
          <code>{"{{cursor}}"}</code> is removed from the text, and the caret lands there.
        </p>
        <p>
          Every <code>{"{{prompt:Label}}"}</code> with the same label gets one field in the{" "}
          <strong>Template fields</strong> dialog, and all of them get the answer. Press Enter to
          continue, or Esc to cancel without writing anything. Unknown tokens are left as typed.
        </p>
        <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-0">Three ways to use one</h4>
        <ul>
          <li>
            <strong>
              <code>/template</code> or <code>/tpl</code>
            </strong>{" "}
            in the slash menu: pick a template and it&apos;s inserted at the caret, as one undo step.
            An empty note gets the whole template; otherwise only the part below its frontmatter.
          </li>
          <li>
            <strong>A missing link:</strong> clicking <code>[[rfcs/auth-spec]]</code> creates{" "}
            <code>rfcs/auth-spec.md</code>. When a template is named after the folder (
            <code>rfc</code> or <code>rfcs</code>), you confirm with Enter; otherwise pick a template
            or <strong>Blank note</strong>. <code>[[idea]]</code> goes to your New Notes Folder.
          </li>
          <li>
            <strong>New note from template…</strong> in the command palette: pick a template, type a
            title, and the note is created and opened.
          </li>
        </ul>
        <p>
          For the palette command, a template can say where its notes go with two frontmatter keys.
          Tokens work in both, and neither key is copied into the note:
        </p>
        <Code>
          {"---\ntarget_folder: rfcs\nfile_name: rfc-{{date}}-{{slug}}\n---\n# {{title}}\nOwner: {{prompt:Owner}}\n{{cursor}}"}
        </Code>
        <p>
          Lines starting with <code>#</code> inside a template&apos;s frontmatter are comments for
          you. They don&apos;t reach created notes, and a block that holds only comments is dropped.
        </p>
        <Callout type="note">
          A clicked link always decides where its note goes, and the link text is never changed.
          Existing files are never overwritten: if the note is already on disk, it opens as is.
        </Callout>
        <p>
          AI Chat can write templates for you; see{" "}
          <a href="#ai-templates" className="text-sage font-semibold hover:underline">AI templates</a>.
        </p>
      </>
    ),
  },
];
