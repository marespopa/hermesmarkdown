import { Callout, Code, KV, type Subsection } from "../doc-primitives";
import { templatesPageItem } from "./templates-page";
import TextLink from "@/app/components/TextLink";

const h4 = "text-[19px] font-semibold tracking-tight !mb-2 !mt-0";

// Documentation content: Editor group, vault templates.
export const templatesItems: Subsection[] = [
  {
    id: "templates",
    title: "Templates",
    lead: "A template is a file you start other files from. Fields like Today's date or Ask: Owner fill in each time you use it.",
    keywords: "template templates year month day weekday month name week number quarter slug save as template edit template blank tab fill in date format date math tomorrow selection quick start empty note preview tpl snippet log entry timestamp token field add field placeholder prompt question ask cursor clipboard date new note missing link folder new notes go where name clash already exists new template create template week name weekly monthly quarterly yearly iso week quarter pack packs folder template scaffold structure",
    body: (
      <>
        <h4 className={h4}>Make a template</h4>
        <p>
          Run <strong>New template…</strong> from the command palette, or press{" "}
          <strong>New template</strong> on the Templates page. Pick a file or a folder template, give it
          a name, and start blank or from an example; it opens so you can add what you need. Nothing is
          overwritten. See the <TextLink href="#templates-page">Templates page</TextLink>.
        </p>
        <p>
          Or turn a file you already like into one: run <strong>Save as template…</strong> from the
          command palette, or type <code>/save-template</code> in the file. Only a name is asked,
          prefilled from the note&apos;s first heading. The note is copied into{" "}
          <code>_templates/</code> as a plain <code>.md</code> file.
        </p>
        <p>
          Edit a template like any note: open it from Files, or hover it in the template
          list and press the pencil (⌘E / Ctrl+E). The line at the top says{" "}
          <strong>Editing template</strong>, with a link back to the <strong>Templates page</strong>. Changes save as you type and apply the next time you
          use it.
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
            { label: "Today's date", value: "2026-10-05; any format, see below" },
            { label: "Current time", value: "14:30" },
            { label: "File title", value: "The new file's title" },
            { label: "Year, Month number, Day of the month", value: "2026, 10, 05" },
            { label: "Day name, Month name", value: "Monday, October; short forms Mon, Oct" },
            { label: "Week number, Quarter", value: "41, Q4" },
            { label: "Title as file name", value: "The title in kebab-case: auth-spec" },
            { label: "Clipboard", value: "What you last copied" },
            { label: "Start typing here", value: "Where the caret lands" },
            { label: "Selected text", value: "What you had selected when inserting the template" },
            { label: "Tomorrow's date", value: "2026-10-06; also any other day, week, month or year away" },
            { label: "Yesterday's date", value: "2026-10-04" },
            { label: "Long date", value: "Monday, 5 October 2026" },
            { label: "This week's name", value: "2026-W41" },
            { label: "Blank to fill in…", value: "Stays in the new file as a highlighted blank, e.g. Task 1" },
          ]}
        />
        <p>
          In a template, fields show as small labelled boxes. Click one to see what&apos;s really
          written in the file. If something won&apos;t fill in, such as a misspelled field, the
          line at the top tells you.
        </p>
        <h4 className={h4}>Fill in the blanks</h4>
        <p>
          Blanks left by a template show as grey boxes in the new file. Press <strong>Tab</strong>{" "}
          to select the next one and type to replace it, or <strong>Shift+Tab</strong> to go back.
          Clicking a blank selects it too. When none are left, you&apos;ll see{" "}
          <strong>Template ready ✦</strong>. Press Esc to use Tab normally again in that file.
        </p>
        <h4 className={h4}>Where new files go</h4>
        <p>
          A template only gives a file its text. A file made from a link is named by the link and goes
          in the link&apos;s folder if it has one (<code>[[rfcs/auth-spec]]</code> goes in{" "}
          <code>rfcs/</code>), else in your New Files folder.
        </p>
        <Callout type="note">
          If a file with that name is already in that folder, it opens (or is linked) as it is. Nothing
          is overwritten, and no <code>name (1)</code> copy is made.
        </Callout>
        <h4 className={h4}>Use a template</h4>
        <ul>
          <li>
            <strong>An empty file</strong> shows your templates as small buttons under the first line;
            click one to fill the file. With no templates yet, the built-in examples (meeting notes and a
            project brief) are offered instead, and <strong>New template</strong> makes your own.
          </li>
          <li>
            <strong><code>/template</code></strong> in a file inserts a template where you&apos;re
            typing. Click a template to preview it, then <strong>Use template</strong>, or press ⌘1–⌘9
            (Ctrl+1–9).
          </li>
          <li>
            <strong>Links:</strong> clicking a link to a file that doesn&apos;t exist yet, or the{" "}
            <strong>From template</strong> tab when adding a link, lets you pick a template or a blank
            file. The template the name points to comes first: one named after the folder (
            <code>rfcs/</code> → <code>rfc</code>), one whose name starts it (&quot;Meeting notes
            2026-10-05&quot;), or your journal for a date.
          </li>
        </ul>
        <h4 className={h4}>Folder templates</h4>
        <p>
          A folder template creates a whole set of files at once, such as a project with its folders and
          starter files. Make one with <strong>New template</strong> (choose <strong>Folder</strong>), or
          by hand: add a folder to <code>_templates/</code> and put{" "}
          <code>scaffold: true</code> in the frontmatter of its <code>README.md</code>. Everything in the
          folder is copied: notes, other files and empty subfolders. The README is copied too, without the{" "}
          <code>scaffold</code> line, and opens when the folder is done.
        </p>
        <ul>
          <li>
            Run it from the command palette (<strong>New from folder template…</strong>, then pick where
            it goes), or right-click a folder in Files (or the empty space) and choose{" "}
            <strong>New from Folder Template…</strong>.
          </li>
          <li>
            Fields and dates work in file and folder names as well as in notes. A folder called{" "}
            <code>{"_templates/{{prompt:Client}} engagement/"}</code> asks for the client once and creates{" "}
            <code>Acme engagement</code>; <code>{"{{date:YYYY-MM}} review.md"}</code> becomes a dated name.
            Characters a name can&apos;t have (such as <code>:</code> or <code>/</code>) become{" "}
            <code>-</code>.
          </li>
          <li>
            It never replaces anything. If the new folder already exists, or two names would end up the
            same, nothing is created and you are told why. If a write fails halfway, what was made is
            removed again.
          </li>
          <li>
            Two examples come built in: a <strong>Project folder</strong> (README, Tasks, Decisions and a
            Kickoff meeting) and a <strong>Research folder</strong> (README, Sources and Open questions).
            Both ask for the folder&apos;s name. Use them as they are from{" "}
            <strong>New from folder template…</strong>, or press <strong>Start from this</strong> on the
            Templates page to make your own copy.
          </li>
        </ul>
        <h4 className={h4}>Under the hood</h4>
        <p>
          Templates are the <code>.md</code> files in <code>_templates/</code> at the root of your
          vault, directly or one folder down in a pack. The folder is made the first time you need it.
          They stay plain text: a field is written{" "}
          <code>{"{{date}}"}</code> and a question <code>{"{{prompt:Owner}}"}</code>. You can also type these by hand.
          Typing <code>{"{{"}</code> opens the same field list:
        </p>
        <Code>
          {"---\nstatus: draft\n---\n# {{title}}\nOwner: {{prompt:Owner}}\n{{cursor}}"}
        </Code>
        <p>
          Dates take a format after a colon, such as <code>{"{{date:dddd, D MMMM}}"}</code> (Monday, 5
          October) or <code>{"{{time:H.mm}}"}</code>, using <code>YYYY YY MMMM MMM MM M dddd ddd DD D HH H mm ss</code>,{" "}
          <code>ww</code> (ISO week), <code>GGGG</code> (that week&apos;s year), <code>Q</code> (quarter)
          and <code>[literal text]</code>. Date math works too: <code>{"{{date+1d}}"}</code>,{" "}
          <code>{"{{date-2w}}"}</code>, <code>{"{{date+1m}}"}</code>, <code>{"{{date+1y}}"}</code>, and with a
          format, <code>{"{{date+1d:dddd}}"}</code>. <code>{"{{selection}}"}</code> is the selected text.
          The date parts have short names too: <code>{"{{year}}"}</code>, <code>{"{{month}}"}</code>,{" "}
          <code>{"{{day}}"}</code>, <code>{"{{weekday}}"}</code>, <code>{"{{monthName}}"}</code>,{" "}
          <code>{"{{week}}"}</code>, <code>{"{{quarter}}"}</code>, and <code>{"{{slug}}"}</code> is the
          title as a file name. Field names work in any case: <code>{"{{Year}}"}</code> is{" "}
          <code>{"{{year}}"}</code>. Any other name, like <code>{"{{task_1}}"}</code>, is a blank.
        </p>
        <KV
          rows={[
            { label: "This week", value: "{{date:GGGG-[W]ww}} → 2026-W42" },
            { label: "This month", value: "{{date:YYYY-MM}} → 2026-10" },
            { label: "This quarter", value: "{{date:YYYY-[Q]Q}} → 2026-Q4" },
            { label: "This year", value: "{{date:YYYY}} → 2026" },
            { label: "Last week's file", value: "[[{{date-1w:GGGG-[W]ww}}]]" },
          ]}
        />
        <p>
          Use these in headings and links, for example in weekly, monthly or yearly files. Frontmatter
          lines (author, status, …) are copied into each new file. Templates stay out of the Tasks
          page. The AI companion can write templates for you; see{" "}
          <TextLink href="#ai-templates">AI templates</TextLink>.
        </p>
      </>
    ),
  },
  templatesPageItem,
];
