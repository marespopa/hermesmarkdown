import { Callout, Code, KV, type Subsection } from "../doc-primitives";

// Documentation content: Editor group, workspace features (tasks through command palette).
export const editorWorkspaceItems: Subsection[] = [
  {
    id: "tasks-page",
    title: "Tasks page",
    lead: "A vault-wide checklist — every checkbox task across every note, on a Board or in four lists: Now, Today, Upcoming and All.",
    keywords:
      "task tasks checkbox status todo in progress hold blocked done cancelled pane aggregate due date priority tags filter now today upcoming overdue smart list swipe started done date stamp files board kanban columns drag",
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
    id: "frontmatter",
    title: "Frontmatter",
    lead: "The YAML block at the top of a file — edited as plain text, with a shortcut to add one.",
    keywords: "yaml frontmatter metadata title tags collapse fold",
    body: (
      <>
        <p>
          Type <code>/frontmatter</code> to insert a starter block with <code>title</code> and{" "}
          <code>tags</code> and put the cursor on the title. If the file already has frontmatter,
          the same command unfolds it and jumps to it instead.
        </p>
        <Code>{`---
title:
tags: []
---`}</Code>
        <p>
          The editor gives frontmatter a subtle background. Collapsed, it shrinks to one quiet{" "}
          <strong>Properties</strong> row at the top of the note. A <code>status</code> and the first
          few <code>tags</code> show as chips, followed by the names of the other keys (for example{" "}
          <em>Properties · draft #work #ideas · title, created</em>). Click the row, or press the up arrow from the
          first line, to expand it; the same row, now the top of the frontmatter panel, collapses it again.
          Clicking the row changes the note in front of you (in every split pane showing it) and is
          remembered: notes you open next start the same way.
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
    keywords: "palette commands fuzzy filter full-text search note text",
    body: (
      <>
        <p>
          Open it anywhere with <code>CTRL/CMD+K</code> (files) or <code>CTRL/CMD+SHIFT+P</code>{" "}
          (commands). On mobile, tap the active-file bar. The palette opens in Quick Open mode,
          where plain text searches note names and paths. To search inside notes, start with{" "}
          <code>/</code> or press <code>CTRL/CMD+SHIFT+F</code>.
        </p>
        <KV
          rows={[
            { label: "Plain text", value: "Files by name or path" },
            { label: "#", value: "All unique vault tags; choose one to filter Files" },
            { label: ">", value: "Commands by name, description, category, or keyword" },
            { label: "!", value: "Tasks; choose one to open its note at the source line" },
            { label: "@", value: "Headings in the active note; choose one to place it at the top" },
            { label: "/", value: "Note text across the vault; choose a line to open the note at that match" },
          ]}
        />
        <p>
          Note text search ignores case and finds notes that contain every word you type, in any
          order (at least 2 characters; no fuzzy matching). Frontmatter isn&apos;t searched; code
          blocks are. Exact phrases rank first, and each note shows up to three matching lines.
          Private notes never appear in note text results, whatever the Privacy Mode. Right after
          a vault opens, a footnote shows how many notes are still being indexed.
        </p>
        <Callout type="tip">
          Prefixes select a result type; they are not combined. For example, <code>#project</code>{" "}
          searches tags only, while <code>&gt;project</code> searches commands only.
        </Callout>
        <p>
          Matching is fuzzy and deterministic. Recently opened files and recently run commands
          receive a ranking boost. Commands that need a vault, active note, selection, AI provider
          or another pane remain visible when useful and explain why they are disabled.
          Async commands show a running state and cannot be submitted twice. Press{" "}
          <code>CTRL/CMD+D</code> to pin the selected file or command (up to five) to the top of the
          palette.
        </p>
        <KV
          rows={[
            { label: "Save", value: "CTRL+S" },
            { label: "Notes", value: "New Note, Open Note from Disk…, Download as Markdown (always a .md download, never a save), Copy Markdown, Rename / Duplicate / Move / Delete Note" },
            { label: "Folders", value: "New folder (one level at a time)" },
            { label: "Editing", value: "Undo, redo, focus, formatting, tasks, and templates" },
            { label: "AI", value: "Chat and selection/document actions" },
          ]}
        />
        <KV
          rows={[
            { label: "Open Home", value: "Your vault's home feed: recent notes" },
            { label: "Export as PDF…", value: "Print the note, or save it as a PDF" },
            { label: "Show Files", value: "CTRL/CMD+SHIFT+E" },
            { label: "Open Tasks", value: "—" },
            { label: "Open Templates", value: "Your templates and template packs" },
            { label: "Panes", value: "Open in pane, split down, next/previous, close" },
            { label: "Tabs", value: "Next/previous, close current/other/all" },
            { label: "Tasks", value: "Grouping, due-date filters, and clear filters" },
            { label: "Toggle Hidden Files / Toggle Sidebar", value: "—" },
            { label: "Theme: Light / Dark / System", value: "—" },
            { label: "Toggle Full Width / Word Wrap / Line Numbers / Invisibles / Word Count / Vim Mode", value: "—" },
            { label: "Focus: …", value: "Off, hide interface while typing, or also dim other paragraphs or sentences" },
            { label: "Settings", value: "Editor Font, Text Size, Autosave, Open Settings" },
            { label: "GitHub", value: "Commit, push, sync, pull — GitHub vaults only" },
          ]}
        />
        <KV
          rows={[
            { label: "Open Vault / Close Vault / Refresh Vault", value: "—" },
            { label: "Create New Vault", value: "—" },
            { label: "New Note", value: "Blank note, named from its first line" },
            { label: "New Folder", value: "Choose a vault folder, then enter a name" },
            { label: "Rename / Delete", value: "Uses the same prompts for files and folders" },
            { label: "Open AI Chat", value: "CTRL+SHIFT+B · when AI is configured" },
            { label: "Navigate", value: "Open Home, Open Settings, Open Documentation, Show Keyboard Shortcuts" },
          ]}
        />
        <p>
          Searching for a note that doesn&apos;t exist? The last result,{" "}
          <strong>Create &quot;…&quot;</strong>, starts a new note with that title. The{" "}
          <strong>&gt;</strong> button in the search field switches between searching files and
          searching commands.
        </p>
        <p>
          Use <code>↑</code>/<code>↓</code> (or <code>Tab</code>/<code>Shift+Tab</code>) to move
          through results, <code>Enter</code> to run the selected item, and <code>Escape</code> to close. The controlled
          clear button resets the query without closing the palette and returns focus to the search field.
        </p>
        <p>
          Combine this with the per-context shortcuts in{" "}
          <a href="#keyboard-shortcuts" className="text-accent hover:underline">Keyboard shortcuts</a>{" "}
          and the slash command menu (<code>/</code>) for inserting content, and the editor is fully
          operable without ever reaching for the mouse.
        </p>
      </>
    ),
  },
];
