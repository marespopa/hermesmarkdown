import { Callout, Code, KV, type Subsection } from "../doc-primitives";

// Documentation content: Editor group, workspace features (tasks through command palette).
export const editorWorkspaceItems: Subsection[] = [
  {
    id: "tasks-page",
    title: "Tasks page",
    lead: "A vault-wide checklist — every checkbox task across every note, grouped by status or note.",
    keywords:
      "task tasks checkbox todo prog hold done pane explorer aggregate due date priority tags filter",
    body: (
      <>
        <p>
          Open it from the command palette (Open Tasks). The page scans every file in the vault for Markdown task lines.
        </p>
        <KV
          rows={[
            { label: "- [ ] task", value: "To Do" },
            { label: "- [ ] task #prog  /  - [/] task", value: "In Progress" },
            { label: "- [ ] task #hold", value: "On Hold" },
            { label: "- [x] task", value: "Done" },
          ]}
        />
        <p>
          A task counts as In Progress when it's unchecked and either tagged <code>#prog</code>{" "}
          anywhere on the line or uses the <code>[/]</code> checkbox marker. It counts as On Hold
          when it's unchecked and tagged <code>#hold</code>. The <code>#prog</code>/<code>#hold</code>{" "}
          tags — along with <code>#todo</code> and <code>#done</code>, which are purely cosmetic — are
          stripped from the text shown on the page.
        </p>
        <p>
          A task can also carry a due date (<code>@due(2026-01-31)</code>), a priority (
          <code>@priority(high|med|low)</code>), and any number of custom <code>#tags</code> — all
          stripped from the display text and shown separately under the task. Due dates are
          color-coded: overdue tasks are flagged in red, tasks due today in amber.
        </p>
        <p>
          The toolbar above the list lets you switch between grouping by status and grouping by
          file, filter by search text, due-date bucket (overdue, due today, upcoming, no due date),
          or one or more custom tags. Combine tag filters to show only tasks carrying every selected
          tag. Sort tasks by due date, priority, status, note, or task text in either direction. A
          Clear button appears once any filter is active.
        </p>
        <p>
          Click a task's checkbox to toggle it — the change writes straight back to the source line
          in the file, no need to open it first. Click the task text instead to open its note and
          jump to that line.
        </p>
        <Callout type="note">
          The Done group starts collapsed so completed work doesn't crowd out what's still
          outstanding; To Do, In Progress, and On Hold start expanded. Click a group header to fold
          or unfold it.
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
          callout and <code>/collapse</code> adds a foldable one that starts collapsed. Change{" "}
          <code>note</code> to any type below.
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
    id: "voice-input",
    title: "Voice input",
    lead: "Dictate straight into a note — transcription only, with a small set of spoken commands to control the session, not to format the note.",
    keywords: "voice mic microphone dictation speech speech-to-text talk grammar commands",
    body: (
      <>
        <p>
          Start voice input from the command palette (Start voice input) or with{" "}
          <code>CTRL+SHIFT+V</code> to start listening. Speech
          accumulates in an editable preview box instead of the document itself, so
          you can fix a mishear before it ever touches your note. Say <code>&quot;insert this&quot;</code>{" "}
          (or press <code>Enter</code>) to commit the reviewed text at the cursor, <code>Shift+Enter</code>{" "}
          to add a line break within the preview, or <code>Escape</code> to discard it.
        </p>
        <Callout type="warning">
          Voice input uses the browser's built-in Web Speech API, which only Chromium-based browsers
          implement — see{" "}
          <a href="#installation" className="text-accent hover:underline">Installation</a>.
          On unsupported browsers the Start voice input command is disabled and explains why.
        </Callout>
        <p>
          Dictation is transcription only — it never inserts Markdown syntax or otherwise formats the
          note from speech. A small set of session-control phrases works instead, since those act on
          the preview buffer rather than the document:
        </p>
        <KV
          rows={[
            { label: '"new paragraph" / "new line" / "new row"', value: "Blank line / line break" },
            { label: '"period" / "comma" / "question mark" / "exclamation point"', value: "Punctuation, mid-sentence or standalone" },
            { label: '"colon" / "semicolon"', value: "Punctuation" },
            { label: '"scratch that" / "delete last" / "undo that"', value: "Remove the previous dictated phrase" },
            { label: '"scratch all text" / "clear all text" / "clear everything"', value: "Clear the whole preview" },
            { label: '"insert this/it/text" / "commit this/it/text"', value: "Commit the preview into the document" },
            { label: '"insert this and stop listening"', value: "Commit, then turn the mic off" },
            { label: '"stop listening" / "done listening"', value: "Discard the preview and turn the mic off" },
          ]}
        />
        <Callout type="tip">
          Everything else is transcribed as plain text, so ordinary dictation always works. Sentences
          capitalize themselves automatically after a spoken &quot;period&quot;, &quot;question
          mark&quot;, or &quot;exclamation point&quot; (a comma or colon doesn&apos;t count).
        </Callout>
        <p>
          Listening stops automatically when the pane loses focus, the tab is backgrounded, or you
          toggle voice input off again. If the browser denies microphone access, loses its network
          connection mid-session, or can&apos;t find a microphone, a toast explains why and listening
          stops rather than retrying silently.
        </p>
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
          Sensitive notes never appear in note text results, whatever the Privacy Mode. Right after
          a vault opens, a footnote shows how many notes are still being indexed.
        </p>
        <Callout type="tip">
          Prefixes select a result type; they are not combined. For example, <code>#project</code>{" "}
          searches tags only, while <code>&gt;project</code> searches commands only.
        </Callout>
        <p>
          Matching is fuzzy and deterministic. Recently opened files and recently run commands
          receive a ranking boost. Commands that need a vault, active note, selection, AI provider,
          voice support, or another pane remain visible when useful and explain why they are disabled.
          Async commands show a running state and cannot be submitted twice. Press{" "}
          <code>CTRL/CMD+D</code> to pin the selected file or command (up to five) to the top of the
          palette.
        </p>
        <KV
          rows={[
            { label: "Save", value: "CTRL+S" },
            { label: "Files", value: "New, import, export, copy, rename, duplicate, move, move to Trash" },
            { label: "Folders", value: "New folder (one level at a time)" },
            { label: "Editing", value: "Undo, redo, focus, formatting, tasks, and templates" },
            { label: "AI", value: "Chat, generate note, repurpose, and selection/document actions" },
          ]}
        />
        <KV
          rows={[
            { label: "Home feed", value: "Your recent notes" },
            { label: "Open Explorer", value: "CTRL/CMD+SHIFT+E" },
            { label: "Open Tasks", value: "—" },
            { label: "Panes", value: "Open in pane, split down, next/previous, close" },
            { label: "Tabs", value: "Next/previous, close current/other/all" },
            { label: "Tasks", value: "Grouping, due-date filters, and clear filters" },
            { label: "Show / hide hidden files", value: "—" },
            { label: "Appearance", value: "Theme, full width, word wrap, and line numbers" },
            { label: "Settings", value: "Editor font, autosave, Vim, and AI provider" },
            { label: "GitHub", value: "Commit, push, sync, pull — GitHub vaults only" },
          ]}
        />
        <KV
          rows={[
            { label: "Open Vault / Close Vault / Refresh Vault", value: "—" },
            { label: "Create new vault", value: "—" },
            { label: "New file", value: "Blank note, named from its first line" },
            { label: "New file in folder… / New folder", value: "Choose a vault folder, then enter a name" },
            { label: "Rename / Delete", value: "Uses the same prompts for files and folders" },
            { label: "Start / Stop voice input", value: "CTRL+SHIFT+V" },
            { label: "Insert / discard voice preview", value: "When a preview exists" },
            { label: "Open AI Chat", value: "CTRL+SHIFT+B · when AI is configured" },
            { label: "Navigate", value: "Home, editor, settings, documentation, and welcome tour" },
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
