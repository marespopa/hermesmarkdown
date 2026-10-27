import { Callout, Code, KV, type Subsection } from "../doc-primitives";
import TextLink from "@/app/components/TextLink";

// Documentation content: Editor group, workspace features (tasks through command palette).
export const editorWorkspaceItems: Subsection[] = [
  {
    id: "tasks-page",
    title: "Tasks page",
    lead: "A vault-wide checklist — every checkbox task across every note, on a Board or in four lists: Now, Today, Upcoming and All.",
    keywords:
      "task tasks checkbox status todo in progress hold blocked done cancelled aggregate due date priority tags filter now today upcoming overdue smart list swipe started done date stamp files board kanban columns drag",
    body: (
      <>
        <p>
          Open it from the command palette (Open Tasks). The page scans every file in the vault for Markdown task lines.
        </p>
        <KV
          rows={[
            { label: "- [ ] task", value: "To Do" },
            { label: "- [/] task", value: "In Progress" },
            { label: "- [!] task", value: "On Hold" },
            { label: "- [x] task", value: "Done" },
            { label: "- [-] task", value: "Cancelled" },
          ]}
        />
        <p>
          A task's status is the character in its box, and nothing else: tags on the line never
          change it. In the editor the box shows as typed, so you can write the status by hand, like{" "}
          <code>[/]</code> for In Progress (keep one character between the brackets).{" "}
          <code>Ctrl/Cmd+Click</code> on the box or <code>Ctrl/Cmd+Enter</code> cycles To Do → In
          Progress → Done → To Do (on hold resumes, cancelled reopens), and the command palette has
          Task: Start, Task: Put on hold, Task: Cancel and Task: Reset to To Do.
        </p>
        <p>
          Status changes from the box, the shortcut, the palette or the Tasks page date the task for
          you (a status typed by hand doesn&apos;t). Starting it adds <code>@started(2026-10-12)</code>{" "}
          (once: pausing and resuming keeps the first date), and completing it adds{" "}
          <code>@done(2026-10-12)</code>, both at the end of the line. Reopening a done task removes{" "}
          <code>@done</code>; resetting it to To Do removes both, as if it was never started. The
          Tasks page shows them under the task, like <em>Started 2 days ago</em> or{" "}
          <em>Done today</em>, and you can edit or delete them like any other text.
        </p>
        <p>
          A task can also carry a due date (<code>@due(2026-01-31)</code>), a priority (
          <code>@priority(high|med|low)</code>), and any number of custom <code>#tags</code> — all
          stripped from the display text and shown separately under the task. Due dates are
          color-coded: overdue tasks are flagged in red, tasks due today in amber.
        </p>
        <KV
          rows={[
            { label: "Board", value: "A column per status: To Do [ ], In Progress [/], On Hold [!], Done [x]. The page opens on it" },
            { label: "Now", value: "In Progress, then Up Next: the next five to-dos by due date" },
            { label: "Today", value: "Overdue, then due today" },
            { label: "Upcoming", value: "Later due dates, one section per day" },
            { label: "All", value: "Every task, grouped by status or by note" },
          ]}
        />
        <p>
          Switch lists with the control under the title; each shows how many tasks it holds, and
          the page remembers the last one. Now, Today and Upcoming list only open tasks (to do, in
          progress, on hold). Type in the search field to filter by text, or type <code>#</code> to
          pick a tag; picked tags show as chips under the field, and a task must carry every one.
          Search and tags apply to every list. In All, the ⋯ menu groups by status or by note and
          sorts by due date, priority, status, note or title, ascending or descending.
        </p>
        <p>
          Click a task&apos;s status ring to move it on, as in the editor: To Do → In Progress →
          Done → To Do (on hold resumes, cancelled reopens). For any other status, right-click the ring (long-press on touch) or use the ⋯ button at the end of
          the row. The change writes straight back to the source line in the file, no need to open
          it first. To open its note at that line, click the task text, double-click the row, or
          choose <strong>Open Note</strong> from the same menu.
        </p>
        <p>
          On the Board, drag a card to another column to give it that status; it moves at once.
          Cancelled tasks stay off the board. On a narrow screen the columns scroll sideways; the
          ring, the menu and swiping work there too.
        </p>
        <p>
          After a change, the task stays where it is for a moment, already showing its new status,
          so you can tick off several in a row without the list moving under you; then it moves to
          its new place. A toast says what changed, with <strong>Undo</strong> to put the line back
          exactly as it was, dates included.
        </p>
        <p>
          On a touch screen, swipe a task. Swipe right to move it forward: Start a to-do, Complete a
          task in progress, Resume one on hold, or Reopen a done or cancelled one. Swipe left to set
          it aside: Hold, or Cancel a task already on hold. The action runs once the row passes the
          point where its label brightens; let go before that to leave the task as it was.
        </p>
        <Callout type="note">
          In All grouped by status, In Progress comes first, then To Do and On Hold. Done and
          Cancelled start collapsed so finished work doesn't crowd out what's still outstanding.
          Click a group header to fold or unfold it.
        </Callout>
      </>
    ),
  },

  {
    id: "tags-page",
    title: "Tags page",
    lead: "Every tag in your vault, how many notes carry it, and those notes, newest first.",
    keywords: "tags tag page hashtag #tag count notes pin tag sidebar frontmatter tags privacy",
    body: (
      <>
        <p>
          Open <strong>Tags</strong> from the sidebar, or run <strong>Open Tags</strong> from the command
          palette. A tag is an inline <code>#tag</code> in a note, or one listed under <code>tags:</code>{" "}
          in its frontmatter. The page lists every tag with how many notes carry it; pick one to see those
          notes, the most recently changed first, and click a note to open it.
        </p>
        <p>
          The tag you pick is in the address (<code>/editor/tags?tag=release</code>), so a refresh or a
          link lands on it. <strong>Pin</strong> beside its name keeps it in the sidebar. With Privacy Mode
          on, private notes are left out of the counts as well as the list.
        </p>
      </>
    ),
  },

  {
    id: "frontmatter",
    title: "Frontmatter",
    lead: "The YAML block at the top of a file — edited as plain text, with a shortcut to add one.",
    keywords: "yaml frontmatter metadata title tags properties collapse fold",
    body: (
      <>
        <p>
          Type <code>/frontmatter</code> to insert a starter block with <code>title</code> and{" "}
          <code>tags</code> and put the cursor on the title. If the file already has frontmatter,
          the same command jumps to its title instead.
        </p>
        <Code>{`---
title:
tags: []
---`}</Code>
        <p>
          The editor shows frontmatter exactly as typed, on a subtle tinted panel. Hover it for a
          chevron in the margin by the opening <code>---</code>: it folds the whole block into one
          line showing just its <code>title</code> (its <code>name</code> when there is no title)
          and its <code>tags</code> as pills; click that line to unfold it. Folding or unfolding
          moves the cursor to the top of the note, so the page stays where it is. With the caret inside,
          Ctrl/Cmd+Shift+. folds or unfolds it too. The note keeps it folded while you switch away
          and back during the visit.
        </p>
        <p>
          Typing inside the frontmatter offers what your vault already uses: keys at the start of a
          line (<code>ti</code> → <code>title</code>), your tags inside <code>tags: [ ]</code> or a{" "}
          <code>- </code> list, and values other notes repeat, like <code>status: draft</code>. Nothing
          is inserted until you pick an option.
        </p>
      </>
    ),
  },
  {
    id: "callout-blocks",
    title: "Callout blocks",
    lead: "Obsidian-compatible callout syntax — a typed, foldable blockquote, written in plain Markdown.",
    keywords: "callout note tip warning danger collapse foldable",
    body: (
      <>
        <Code>{`> [!tip] Optional title
> Body text, same as a regular blockquote.`}</Code>
        <p>
          Insert one from the slash menu: <code>/callout</code> adds a plain <code>[!note]</code>{" "}
          callout and <code>/collapse</code> adds a foldable one that starts collapsed. A menu of
          types opens right away; pick one, or press Esc to keep note. To change it later, type
          any type below in place of <code>note</code>.
        </p>
        <p>
          Add <code>+</code> or <code>-</code> after the type to make it foldable: <code>+</code>{" "}
          starts expanded, <code>-</code> starts collapsed. No suffix means a plain, non-foldable
          callout.
        </p>
        <Code>{`> [!warning]- Collapsed by default
> Click the title to expand.`}</Code>
        <p>
          Add one more <code>&gt;</code> to nest: a quote inside a callout gets its own bar, and a
          callout inside a callout draws as an inset card in its own color. Plain quotes nest the
          same way, one bar per level.
        </p>
        <Code>{`> [!note] Outer
> > [!tip] Inner
> > Inside the tip.
> Back in the note.`}</Code>
        <p>The type is case-insensitive and any word works, but these have dedicated colors and icons:</p>
        <KV
          rows={[
            { label: "note", value: "📝" },
            { label: "abstract", value: "📋" },
            { label: "info", value: "ℹ️" },
            { label: "tip", value: "💡" },
            { label: "success", value: "✅" },
            { label: "question", value: "❓" },
            { label: "warning", value: "⚠️" },
            { label: "failure", value: "❌" },
            { label: "danger", value: "🔥" },
            { label: "bug", value: "🐛" },
            { label: "example", value: "📑" },
            { label: "quote", value: "💬" },
          ]}
        />
        <Callout type="note">
          Aliases resolve to one of the types above — e.g. <code>tldr</code> and <code>summary</code>{" "}
          map to <code>abstract</code>; <code>hint</code> and <code>important</code> map to{" "}
          <code>tip</code>; <code>check</code> and <code>done</code> map to <code>success</code>;{" "}
          <code>help</code> and <code>faq</code> map to <code>question</code>;{" "}
          <code>caution</code> and <code>attention</code> map to <code>warning</code>;{" "}
          <code>fail</code> and <code>missing</code> map to <code>failure</code>;{" "}
          <code>error</code> maps to <code>danger</code>; and <code>cite</code> maps to{" "}
          <code>quote</code>. An unrecognized type falls back to the <code>note</code> style with your
          own label.
        </Callout>
      </>
    ),
  },
  {
    id: "command-palette",
    title: "Command palette",
    lead: "A fuzzy-searchable list of every app-level action — open it instead of hunting for a menu.",
    keywords: "palette commands fuzzy filter full-text search note file text grep regex",
    body: (
      <>
        <p>
          Open it anywhere with <code>CTRL/CMD+K</code> (files) or <code>CTRL/CMD+SHIFT+P</code>{" "}
          (commands). On mobile, tap the active-file bar. The palette opens in Quick Open mode,
          where plain text searches file names and paths. To search inside files, start with{" "}
          <code>/</code> or press <code>CTRL/CMD+SHIFT+F</code>.
        </p>
        <p>
          With nothing typed it lists your pinned and recent files, then a short menu of what you
          reach for most: <strong>Search in Files…</strong> (file text), <strong>Ask AI</strong>,{" "}
          <strong>New File</strong>, <strong>Insert template…</strong>, <strong>Toggle Focus Mode</strong>;
          then, set apart, the pages it can take you to: <strong>Open Tasks</strong>,{" "}
          <strong>Open Templates</strong>, <strong>Open Settings</strong> and <strong>Open Documentation</strong>.
          An arrow marks a row that opens another page; <strong>Open Documentation</strong> opens in a new
          tab, so your file stays put. A row with a chevron opens a menu in place; <code>Backspace</code> in its empty search field, or the back button, goes up a
          level.
        </p>
        <KV
          rows={[
            { label: "Plain text", value: "Files by name or path" },
            { label: "#", value: "All unique vault tags; choose one to filter Files" },
            { label: ">", value: "Commands by name, description, category, or keyword" },
            { label: "!", value: "Tasks; choose one to open its note at the source line" },
            { label: "@", value: "Headings in the active note; choose one to place it at the top" },
            { label: "/", value: "File text across the vault (code files too, with Search Code Files on); choose a line to open it at that match" },
            { label: "~", value: "Your templates; Enter inserts one into the note, CTRL/CMD+Enter starts a new note from it" },
          ]}
        />
        <p>
          Text search ignores case and finds files that contain every word you type, in any
          order (at least 2 characters; no fuzzy matching). Frontmatter isn&apos;t searched; code
          blocks are. Exact phrases rank first, and each file shows up to three matching lines.
          Private notes never appear in text results, whatever the Privacy Mode. Right after
          a vault opens, a footnote shows how many files are still being indexed.
        </p>
        <p>
          Turn on <strong>Regex</strong> at the foot of the palette, or press <code>Alt+R</code>, to
          search with a regular expression instead, such as <code>^todo</code> or{" "}
          <code>fetch\w+\(</code>. It ignores case, and <code>^</code> and <code>$</code> match at
          the start and end of each line. Regex stays on until you turn it off. A pattern that takes
          too long is stopped, and the palette says so.
        </p>
        <p>
          <strong>Replace in Files</strong> changes a text across many notes at once. Open it from the
          palette (<strong>Replace in Files…</strong>), or click the <strong>Replace…</strong> chip at
          the foot of the palette while searching with <code>/</code>: it opens the page with your
          search filled in. Type what to find and what to replace it with; <strong>Match case</strong>,{" "}
          <strong>Whole word</strong> and <strong>Regex</strong> narrow or widen the search, and with
          Regex on <code>$1</code>, <code>$&lt;name&gt;</code> and <code>$&amp;</code> in the
          replacement stand for what the pattern captured. Notes are searched whole, frontmatter
          included; turn on <strong>Include code files</strong> to change code and text files too.
          The page lists every match as before and after. Uncheck a match, or a whole file, to leave
          it as it is, then press <strong>Replace</strong>. A file you edited since the preview is
          skipped and reported rather than overwritten. Afterwards <strong>Undo</strong> (in the
          message, and on the page) puts back every file that still holds the replaced text. Private
          notes, the Trash and board drawings are never changed.
        </p>
        <p>
          The palette&apos;s footer lists these modes as chips (Tags, Tasks, Headings, Text, Templates,
          Commands): click one instead of typing its prefix, and click it again to go back to files.
        </p>
        <Callout type="tip">
          Prefixes select a result type; they are not combined. For example, <code>#project</code>{" "}
          searches tags only, while <code>&gt;project</code> searches commands only.
        </Callout>
        <p>
          Matching is fuzzy and deterministic. Recently opened files and recently run commands
          receive a ranking boost. Commands that need a vault, active file, selection, or AI provider
          remain visible when useful and explain why they are disabled.
          Async commands show a running state and cannot be submitted twice. Press{" "}
          <code>CTRL/CMD+D</code> to pin the selected file or command (up to five) to the top of the
          palette.
        </p>
        <KV
          rows={[
            { label: "Save", value: "CTRL+S" },
            { label: "Files", value: "New File, Open File from Disk…, Export as Markdown (always a .md download, never a save), Copy Contents, Rename / Duplicate / Move / Delete File" },
            { label: "Folders", value: "New folder (one level at a time)" },
            { label: "Editing", value: "Undo, redo, focus, formatting, tasks, and templates" },
            { label: "AI", value: "Ask AI (CTRL/CMD+J): opens the AI companion with the note and selection" },
          ]}
        />
        <KV
          rows={[
            { label: "Pin File", value: "Keep the file first in the palette and in Files" },
            { label: "Export as PDF", value: "Print the note, or save it as a PDF" },
            { label: "Export as HTML", value: "Download the note as a standalone web page" },
            { label: "Show Files", value: "CTRL/CMD+SHIFT+E" },
            { label: "Open Tasks", value: "—" },
            { label: "Open Templates", value: "Your templates, New template and examples" },
            { label: "Open files", value: "Next/previous, close current/other/all" },
            { label: "Tasks", value: "Grouping, due-date filters, and clear filters" },
            { label: "Toggle Hidden Files", value: "—" },
            { label: "Theme: Light / Dark / System", value: "—" },
            { label: "Light Theme: … / Dark Theme: …", value: "The palette each mode uses" },
            { label: "Toggle Full Width / Word Wrap / Line Numbers / Invisibles / Git Changes / Word Count / Vim Mode", value: "—" },
            { label: "Toggle Focus Mode", value: "Dim other paragraphs, or turn Focus off" },
            { label: "Focus: …", value: "Off, or dim other paragraphs or sentences" },
            { label: "Settings", value: "Editor Font, Text Size, Autosave, Open Settings" },
          ]}
        />
        <KV
          rows={[
            { label: "Open Vault / Close Vault / Refresh Vault", value: "—" },
            { label: "Create New Vault", value: "—" },
            { label: "New File", value: "Blank file, named from its first line" },
            { label: "New Folder", value: "Choose a vault folder, then enter a name" },
            { label: "Rename / Delete", value: "Uses the same prompts for files and folders" },
            { label: "Ask AI", value: "CTRL/CMD+J · when AI features are on" },
            { label: "Navigate", value: "Open All Files, Open Tags, Open Tasks, Open Templates, Show Changes, Open Trash, Open Settings, Open Documentation, Send Feedback…, Show Keyboard Shortcuts" },
          ]}
        />
        <p>
          Searching for a file that doesn&apos;t exist? The last result,{" "}
          <strong>Create &quot;…&quot;</strong>, starts a new file with that title.
        </p>
        <p>
          Use <code>↑</code>/<code>↓</code> (or <code>Tab</code>/<code>Shift+Tab</code>) to move
          through results, <code>Enter</code> to run the selected item, and <code>Escape</code> to close. The controlled
          clear button resets the query without closing the palette and returns focus to the search field.
        </p>
        <p>
          Combine this with the per-context shortcuts in{" "}
          <TextLink href="#keyboard-shortcuts">Keyboard shortcuts</TextLink>{" "}
          and the slash command menu (<code>/</code>) for inserting content, and the editor is fully
          operable without ever reaching for the mouse.
        </p>
      </>
    ),
  },
];
