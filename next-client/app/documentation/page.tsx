"use client";

import React, { useState, useEffect, useMemo, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineMenu, HiOutlineX, HiOutlineSearch, HiOutlineHome, HiOutlinePencilAlt } from "react-icons/hi";
import Button from "@/app/components/Button/Button.component";

/* ── Local doc primitives ─────────────────────────────────────────────── */

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="p-5 bg-neutral-900 dark:bg-black/40 text-neutral-100 rounded-2xl overflow-x-auto font-mono text-sm leading-relaxed w-full min-w-0">
      <code>{children}</code>
    </pre>
  );
}

function Callout({ type = "note", children }: { type?: "note" | "warning" | "tip"; children: ReactNode }) {
  const labels = { note: "Note", warning: "Warning", tip: "Tip" };
  return (
    <div className="pl-5 py-1 border-l-2 border-black/10 dark:border-white/15 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
      <span className="block text-ui-footnote uppercase tracking-[0.2em] font-bold mb-2 opacity-50">{labels[type]}</span>
      {children}
    </div>
  );
}

function KV({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <div className="p-5 sm:p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/5">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap justify-between border-b border-black/5 dark:border-white/5 py-3 sm:py-4 last:border-none items-baseline gap-x-4 gap-y-1">
          <span className="text-sm font-medium min-w-0 shrink break-words">{r.label}</span>
          <span className="opacity-40 italic text-right text-ui-footnote uppercase tracking-wider font-bold shrink-0 max-w-full break-words">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ShortcutGroups({ groups }: { groups: { context: string; rows: { label: string; shortcut: string }[] }[] }) {
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.context} className="space-y-3">
          <h3 className="text-xs font-bold opacity-30 uppercase tracking-[0.4em]">{g.context}</h3>
          <KV rows={g.rows.map((r) => ({ label: r.label, value: r.shortcut }))} />
        </div>
      ))}
    </div>
  );
}

/* ── Content ───────────────────────────────────────────────────────────── */

type Subsection = {
  id: string;
  title: string;
  lead: string;
  keywords?: string;
  body: ReactNode;
};

type Group = {
  id: string;
  label: string;
  items: Subsection[];
};

const GROUPS: Group[] = [
  {
    id: "get-started",
    label: "Get Started",
    items: [
      {
        id: "installation",
        title: "Installation",
        lead: "HermesMarkdown is a web app — there's nothing to download or install in the traditional sense.",
        keywords: "browser chrome edge firefox safari pwa install",
        body: (
          <>
            <p>
              Vaults are read and written through the browser's File System Access API, which only
              Chromium-based browsers implement. Use one of the browsers below.
            </p>
            <KV
              rows={[
                { label: "Google Chrome", value: "Supported" },
                { label: "Microsoft Edge", value: "Supported" },
                { label: "Brave / Arc / Opera", value: "Supported" },
                { label: "Firefox", value: "Not supported" },
                { label: "Safari", value: "Not supported" },
              ]}
            />
            <Callout type="note">
              On an unsupported browser, the editor still loads, but the vault picker is disabled —
              there's no folder to open or save to.
            </Callout>
            <p>
              HermesMarkdown ships a web app manifest, so supported browsers offer an Install option
              in the address bar. Installing gives it its own window and app icon, but doesn't change
              how it works — it's the same browser-based app, not a native build.
            </p>
          </>
        ),
      },
      {
        id: "create-a-vault",
        title: "Create a vault",
        lead: "A vault is any folder on disk that HermesMarkdown reads and writes Markdown files in directly.",
        keywords: "vault folder open dropbox icloud sync",
        body: (
          <>
            <p>Click the vault icon in the sidebar and pick an existing folder, or create a new one in the picker.</p>
            <p>
              The browser grants HermesMarkdown direct read/write access to that folder for the
              session. Nothing is uploaded — files stay where they are on disk.
            </p>
            <p>
              Everything in the folder — your notes, your subfolders — is yours; HermesMarkdown never
              restructures it or writes files of its own into it.
            </p>
            <Callout type="warning">
              Dropbox and iCloud can lock files mid-sync. If saves start failing inside a synced folder,
              pause the sync client and retry.
            </Callout>
          </>
        ),
      },
      {
        id: "new-vault",
        title: "New vault",
        lead: "Create a fresh, empty vault — name it, pick a location, and start writing.",
        keywords: "new vault create folder name location",
        body: (
          <>
            <p>
              In the sidebar, click the vault icon and choose <strong>New Vault</strong>, or run it from the command palette.
            </p>
            <p>
              Type a vault name (this becomes the folder name on disk) and click <em>Choose parent folder</em> to pick
              where the folder will be created, then click <em>Create Vault</em>.
            </p>
            <p>
              HermesMarkdown creates the folder and opens the vault on a blank note. No example content
              is added.
            </p>
            <Callout type="note">
              The dialog checks for an existing folder with the same name at the chosen location and stops if one is
              found — it will never overwrite an existing directory.
            </Callout>
          </>
        ),
      },
      {
        id: "first-note",
        title: "Your first note",
        lead: "New File opens a blank Markdown file with its frontmatter panel ready to fill in.",
        keywords: "new file title status save autosave frontmatter",
        body: (
          <>
            <p>Use the + button in the sidebar, or run New file from the command palette.</p>
            <p>
              The frontmatter panel opens automatically on every new file, prompting for the fields
              defined in your vault's schema — <code>title</code>, <code>status</code>, and whatever
              else you've configured. Fill in what's relevant and skip the rest; nothing here is
              required beyond <code>title</code>.
            </p>
            <KV
              rows={[
                { label: "title", value: "Required" },
                { label: "status", value: "Defaults to draft" },
                { label: "Everything else", value: "Optional" },
              ]}
            />
            <Callout type="tip">
              Closed the panel without finishing? Click the ✎ icon in the frontmatter header to reopen
              it at any time.
            </Callout>
            <p>
              Save manually with <code>CTRL+S</code>, or rely on autosave — configurable under{" "}
              <a href="#editor-width" className="text-sage font-semibold hover:underline">Settings → Editor</a>.
              The status bar shows whether the file has unsaved changes.
            </p>
          </>
        ),
      },
      {
        id: "editor-layout",
        title: "Editor layout",
        lead: "The app opens straight into a full-screen editor — every panel is summoned, not docked by default.",
        keywords: "sidebar pin pane split toolbar command palette",
        body: (
          <>
            <p>
              There's no formatting toolbar above the text. Formatting happens through Markdown syntax,
              keyboard shortcuts, and the slash command menu.
            </p>
            <p>
              The sidebar (files, search, tasks) stays hidden at rest. Move the mouse to the left edge
              to open it, or pin it with <code>CTRL+SHIFT+E</code>; switching between its panels happens
              from the command palette rather than a row of icons.
            </p>
            <KV
              rows={[
                { label: "Sidebar", value: "Hover edge / CTRL+SHIFT+E" },
                { label: "Command Palette", value: "CTRL+SHIFT+P" },
                { label: "AI Chat", value: "CTRL+SHIFT+B" },
                { label: "Voice input", value: "CTRL+SHIFT+V" },
                { label: "Frontmatter panel", value: "✎ in document header" },
              ]}
            />
            <p>
              Open several files side by side: split right from the tab bar, drag tabs between panes,
              and resize with the divider.
            </p>
          </>
        ),
      },
      {
        id: "keyboard-shortcuts",
        title: "Keyboard shortcuts",
        lead: "The full reference, grouped by where you're using it.",
        keywords: "shortcuts ctrl tab arrows formula",
        body: (
          <ShortcutGroups
            groups={[
              {
                context: "Editor",
                rows: [
                  { label: "Save", shortcut: "CTRL+S" },
                  { label: "Bold", shortcut: "CTRL+B" },
                  { label: "Italic", shortcut: "CTRL+I" },
                  { label: "Undo", shortcut: "CTRL+Z" },
                  { label: "Exit a block, leaving a blank line", shortcut: "SHIFT+ENTER" },
                  { label: "Expand date picker", shortcut: "ALT+↓" },
                  { label: "Toggle sidebar", shortcut: "CTRL+SHIFT+E" },
                  { label: "AI Chat", shortcut: "CTRL+SHIFT+B" },
                  { label: "Voice input", shortcut: "CTRL+SHIFT+V" },
                  { label: "Dismiss / close", shortcut: "ESCAPE" },
                ],
              },
              {
                context: "Table",
                rows: [
                  { label: "Move between cells", shortcut: "TAB / SHIFT+TAB / ARROWS" },
                  { label: "Edit focused cell", shortcut: "ENTER" },
                  { label: "New row at end", shortcut: "ENTER on last row" },
                ],
              },
              {
                context: "Navigation",
                rows: [
                  { label: "Open link or date", shortcut: "CTRL+CLICK" },
                  { label: "Toggle task checkbox", shortcut: "CLICK [ ] / [x]" },
                  { label: "Cycle lifecycle tag", shortcut: "CLICK ‹ #tag ›" },
                ],
              },
              {
                context: "Command Palette",
                rows: [
                  { label: "Open", shortcut: "CTRL+SHIFT+P" },
                  { label: "Filter", shortcut: "Keep typing" },
                  { label: "Navigate results", shortcut: "↑ / ↓" },
                  { label: "Run command", shortcut: "ENTER" },
                  { label: "Dismiss", shortcut: "ESCAPE" },
                ],
              },
            ]}
          />
        ),
      },
    ],
  },
  {
    id: "editor",
    label: "Editor",
    items: [
      {
        id: "writing",
        title: "Writing",
        lead: "Two views of the same file — Rendered shows a formatted WYSIWYG document, Source shows raw Markdown with inline highlighting. Both are editable; toggle between them anytime.",
        keywords: "preview rendering source render inline width narrow standard wysiwyg default",
        body: (
          <>
            <p>
              New files and vaults open in Rendered by default — type directly into a formatted
              document instead of raw syntax. Source is still there for anyone who wants the plain-text
              view: it highlights Markdown inline over the raw text as you type — headings, bold, links,
              and lifecycle tags render in place, without hiding the underlying syntax. Both surfaces
              write to the same file; switching between them never loses changes.
            </p>
            <p>
              Toggle a pane between Source and Rendered with the eye icon in its tab bar, or change the
              default new files open in from Settings → Editor → Default View.
            </p>
            <p>
              Two column widths are available from Settings → Editor: Standard and Narrow. Below the
              medium breakpoint, the column collapses to full width regardless of the setting.
            </p>
            <KV
              rows={[
                { label: "Standard", value: "Wider column, more characters per line" },
                { label: "Narrow", value: "Prose-width column" },
                { label: "Small screens", value: "Full width, setting ignored" },
              ]}
            />
            <Callout type="tip">
              Click actions work without touching raw syntax — checkboxes toggle, lifecycle tags cycle on
              click, and wikilinks open with CTRL+Click.
            </Callout>
          </>
        ),
      },
      {
        id: "tables",
        title: "Tables",
        lead: "Click inside a pipe table for a floating toolbar, and edit cells directly in the text — no separate view to switch to.",
        keywords: "table csv sort alignment",
        body: (
          <>
            <p>
              Type <code>/table</code> in the slash menu, or the <code>{"{table}"}</code> shortcode. Both
              drop a 3×2 starter table with the cursor in the first cell.
            </p>
            <p>
              Click inside any table to get a floating toolbar over it. Drag it out of the way by its
              grip handle if it's covering something you need to see.
            </p>
            <KV
              rows={[
                { label: "Move the toolbar", value: "Drag the grip handle" },
                { label: "Add / remove row", value: "+Row / −Row" },
                { label: "Add / remove column", value: "+Col / −Col" },
                { label: "Cycle column alignment", value: "Left / Center / Right" },
                { label: "Sort a column", value: "↑ / ↓, header cell only" },
                { label: "Copy as CSV", value: "CSV in toolbar" },
                { label: "Delete table", value: "× in toolbar" },
              ]}
            />
            <KV
              rows={[
                { label: "Cell navigation", value: "Tab / Shift+Tab / Arrows" },
                { label: "Edit a cell", value: "Enter" },
                { label: "New row at end", value: "Enter on last row" },
              ]}
            />
            <p>
              Smart sorting recognizes dates, currency, and plain numbers regardless of column
              alignment. Output stays clean, auto-padded Markdown that respects left, center, or right
              alignment markers.
            </p>
            <Callout type="note">
              Table cells hold plain text — there&apos;s no formula engine or spreadsheet-style
              calculation. What you type is what gets written back to the file.
            </Callout>
          </>
        ),
      },
      {
        id: "code-diagrams-math",
        title: "Code, diagrams & math",
        lead: "Fenced code blocks get real syntax highlighting, ```mermaid fences render as live diagrams, and $...$ / $$...$$ render as formulas — all inline, in Rendered view.",
        keywords: "code block syntax highlighting mermaid diagram math latex formula katex",
        body: (
          <>
            <p>
              Any fenced code block (<code>/code</code> in the slash menu, or typing ```` ```lang ````
              yourself) is syntax-highlighted as you type, for any language CodeMirror recognizes from
              the fence's language tag.
            </p>
            <p>
              A ```` ```mermaid ```` fence is a special case: instead of highlighted text, it renders as
              a live diagram, with a small <strong>Diagram / Code</strong> tab in the corner to switch
              between the rendered view and the raw source — clicking the diagram itself also drops
              straight into the source, the same as clicking the tab. Invalid syntax shows an inline error
              instead of a blank diagram.
            </p>
            <Code>{`\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do it]
  B -->|No| D[Skip it]
\`\`\``}</Code>
            <p>
              Math works the same way: type <code>$E=mc^2$</code> and the closing <code>$</code>{" "}
              instantly renders it as a formula. For a multi-line or display formula, use{" "}
              <code>/math</code> from the slash menu, or wrap it in <code>$$...$$</code> yourself. Click
              a formula to edit its raw LaTeX; click away to render it again.
            </p>
            <Callout type="note">
              All three round-trip as plain Markdown — a highlighted code block is still a fenced code
              block on disk, a diagram is still a ```mermaid fence, and a formula is still literal
              <code>$...$</code> text. Nothing HermesMarkdown-specific gets written to the file.
            </Callout>
          </>
        ),
      },
      {
        id: "links",
        title: "Links",
        lead: "Insert a link from the slash menu, or just paste a URL — both give you a title to type over immediately.",
        keywords: "link url hyperlink paste title pill edit",
        body: (
          <>
            <p>
              Type <code>/link</code> in the slash menu (or <code>CTRL+K</code> in Source) to open the Add
              Link dialog — fill in the link text and the URL, then Insert.
            </p>
            <p>
              Pasting a bare URL on its own does the same thing automatically: it lands as a link with a
              placeholder label already selected, so typing immediately replaces it with a real title
              instead of leaving the raw URL as the visible text.
            </p>
            <p>
              Rest the cursor on any link and a small floating pill appears with two actions: the pencil
              reopens the same dialog to edit its text or URL, and the external-link icon opens it.
              <code>CTRL+Click</code> the link directly to open it without the pill.
            </p>
          </>
        ),
      },
      {
        id: "slash-menu",
        title: "Slash menu",
        lead: "Type / anywhere in Rendered view for a searchable, categorized menu of everything insertable — headings, lists, tables, code, callouts, math, and starter templates.",
        keywords: "slash menu templates meeting notes daily note insert",
        body: (
          <>
            <p>
              Keep typing after <code>/</code> to filter by title or keyword; <code>↑</code>/<code>↓</code>{" "}
              to move the selection, <code>Enter</code> to insert, <code>Escape</code> to dismiss.
              Results are grouped under Text, Lists, Insert, Callouts, and Templates.
            </p>
            <p>
              Templates are pre-formatted starting points inserted as regular Markdown you then edit —
              not a separate file type or a live-linked structure.
            </p>
            <KV
              rows={[
                { label: "Meeting Notes", value: "Attendees, agenda, notes, action items" },
                { label: "Daily Note", value: "Today's focus, tasks, notes" },
              ]}
            />
          </>
        ),
      },
      {
        id: "tasks-pane",
        title: "Tasks pane",
        lead: "A vault-wide checklist — every checkbox task across every note, grouped into To Do, In Progress, and Done.",
        keywords: "task tasks checkbox todo prog done pane sidebar aggregate",
        body: (
          <>
            <p>
              Open it from the command palette (Open Tasks). The pane scans every file in the
              vault for Markdown task lines and lists them grouped by status.
            </p>
            <KV
              rows={[
                { label: "- [ ] task", value: "To Do" },
                { label: "- [ ] task #prog", value: "In Progress" },
                { label: "- [x] task", value: "Done" },
              ]}
            />
            <p>
              A task counts as In Progress when it's unchecked and tagged <code>#prog</code> anywhere on
              the line. The <code>#prog</code> tag itself — along with <code>#todo</code> and{" "}
              <code>#done</code>, which are purely cosmetic — is stripped from the text shown in the
              pane. Within each group, tasks are sorted by their note's title.
            </p>
            <p>
              Click a task's checkbox to toggle it — the change writes straight back to the source line
              in the file, no need to open it first. Click the task text instead to open its note and
              jump to that line.
            </p>
            <Callout type="note">
              The Done group starts collapsed so completed work doesn't crowd out what's still
              outstanding; To Do and In Progress start expanded. Click a group header to fold or unfold
              it.
            </Callout>
          </>
        ),
      },
      {
        id: "frontmatter-panel",
        title: "Frontmatter panel",
        lead: "A structured form over the YAML block at the top of a file — edit fields without writing YAML by hand.",
        keywords: "yaml panel sheet mobile title status tags",
        body: (
          <>
            <p>
              Click the ✎ icon in a document's frontmatter header to open the panel. It also opens
              automatically on new files.
            </p>
            <p>
              The panel renders three fields: <code>title</code>, <code>status</code>, and{" "}
              <code>tags</code>. That's the whole schema — fixed, not configurable, kept deliberately
              small.
            </p>
            <p>
              Every change in the panel writes straight back to the YAML block at the top of the file —
              there's no separate save step for frontmatter and no risk of the panel and the raw block
              drifting apart.
            </p>
            <Callout type="note">
              On a mobile screen, the panel uses a bottom-sheet layout to stay clear of the soft keyboard.
            </Callout>
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
              Insert one from the slash menu — search "Callout" for Note, Tip, or Warning. Slash-menu
              callouts start foldable with a click-to-collapse chevron next to the title; hand-typed
              callouts are foldable only if you add <code>+</code> or <code>-</code> yourself.
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
              Start voice input from the command palette (Start voice input) to start listening. Speech
              accumulates in an editable preview box instead of the document itself, so
              you can fix a mishear before it ever touches your note. Say <code>&quot;insert this&quot;</code>{" "}
              (or press <code>Enter</code>) to commit the reviewed text at the cursor, <code>Shift+Enter</code>{" "}
              to add a line break within the preview, or <code>Escape</code> to discard it.
            </p>
            <Callout type="warning">
              Voice input uses the browser's built-in Web Speech API, which only Chromium-based browsers
              implement — see{" "}
              <a href="#installation" className="text-sage font-semibold hover:underline">Installation</a>.
              The mic button is hidden entirely on unsupported browsers.
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
              Listening stops automatically when the pane loses focus, the tab is backgrounded, or the mic
              button is clicked again. If the browser denies microphone access, loses its network
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
        keywords: "palette commands fuzzy filter",
        body: (
          <>
            <p>
              <code>CTRL+SHIFT+P</code>. Keep typing to filter — matching characters are highlighted, and
              each entry shows its own shortcut if it has one.
            </p>
            <p>
              Every command here is a second entry point to something also reachable another way —
              there's no command-only behavior. The palette adapts to context: pane- and file-scoped
              commands only appear when there's an active pane or open file to act on.
            </p>
            <KV
              rows={[
                { label: "Save", value: "CTRL+S" },
                { label: "New file", value: "—" },
                { label: "Export current file", value: "—" },
                { label: "Rename current file", value: "—" },
                { label: "Delete current file", value: "—" },
                { label: "Copy Markdown", value: "—" },
                { label: "Undo / Redo", value: "—" },
                { label: "Close current tab", value: "—" },
                { label: "Close all tabs", value: "—" },
              ]}
            />
            <KV
              rows={[
                { label: "Open Files / Search / Open Tags / Open Views / Open Tasks", value: "—" },
                { label: "Toggle sidebar", value: "CTRL+SHIFT+E" },
                { label: "Split Right / Close Pane / Close other tabs", value: "When more than one pane is open" },
                { label: "Switch pane to Source / Rendered", value: "—" },
                { label: "Toggle hidden files", value: "—" },
                { label: "Toggle word wrap", value: "—" },
                { label: "Toggle tabs bar by default", value: "—" },
                { label: "Switch theme", value: "—" },
                { label: "Open settings", value: "—" },
                { label: "Start welcome tour", value: "—" },
              ]}
            />
            <KV
              rows={[
                { label: "Open vault / Close vault / Refresh vault", value: "—" },
                { label: "Create new vault", value: "—" },
                { label: "New folder", value: "When a vault is open" },
                { label: "Start / Stop voice input", value: "CTRL+SHIFT+V" },
                { label: "Open AI Chat", value: "CTRL+SHIFT+B · when AI is configured" },
                { label: "Repurpose note into blog / social / newsletter draft…", value: "When AI is configured, on a note with content" },
                { label: "Home / Documentation", value: "—" },
                { label: "Focus editor", value: "—" },
              ]}
            />
            <p>
              Combine this with the per-context shortcuts in{" "}
              <a href="#keyboard-shortcuts" className="text-sage font-semibold hover:underline">Keyboard shortcuts</a>{" "}
              and the slash command menu (<code>/</code>) for inserting content, and the editor is fully
              operable without ever reaching for the mouse.
            </p>
          </>
        ),
      },
    ],
  },
  {
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
              Every note is a plain <code>.md</code> file with a small YAML frontmatter block. Open the
              folder in any other editor, sync it with Dropbox or Google Drive, or move it to another
              machine — nothing about it depends on HermesMarkdown being installed. HermesMarkdown never
              writes files of its own into the vault.
            </p>
          </>
        ),
      },
      {
        id: "frontmatter-conventions",
        title: "Frontmatter conventions",
        lead: "Three fields, fixed — all optional except title.",
        keywords: "title status tags",
        body: (
          <>
            <KV
              rows={[
                { label: "title", value: "string · required" },
                { label: "status", value: "enum · default draft" },
                { label: "tags", value: "list · optional" },
              ]}
            />
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">title</h4>
            <p>The note's primary identifier. The only field a note can't be saved without.</p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">status</h4>
            <p>
              One of <code>draft</code>, <code>review</code>, <code>active</code>, or{" "}
              <code>archived</code>. Stays in sync with the document's lifecycle tag — change one and the
              other follows.
            </p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">tags</h4>
            <p>Free-form domain tags, distinct from the lifecycle tag that mirrors <code>status</code>.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "ai-features",
    label: "AI Features",
    items: [
      {
        id: "byok-setup",
        title: "BYOK setup",
        lead: "Every AI feature is hidden until you connect your own Anthropic or Google Gemini key — there's no default model HermesMarkdown provides.",
        keywords: "byok api key anthropic gemini claude provider",
        body: (
          <>
            <KV
              rows={[
                { label: "Anthropic Claude", value: "Sonnet, Haiku, Opus tiers" },
                { label: "Google Gemini", value: "Models fetched from your account" },
              ]}
            />
            <p>
              Settings → AI Features → choose a provider → paste your API key → Test Connection. Once a
              key validates, every AI action in the editor and command palette becomes visible.
            </p>
            <p>
              The key is stored in your browser. Each AI request passes through HermesMarkdown's servers
              on its way to Anthropic or Google — the key is never logged or saved there. See{" "}
              <a href="#privacy-model" className="text-sage font-semibold hover:underline">Privacy model</a>{" "}
              for the full picture.
            </p>
            <Callout type="note">
              Remove a key by clearing the field in Settings → AI Features and saving. AI actions
              disappear again until a new key is set.
            </Callout>
          </>
        ),
      },
      {
        id: "ai-commands",
        title: "AI commands",
        lead: "Highlight text in the editor to bring up a floating toolbar with three actions — only visible once a key is configured.",
        keywords: "improve writing polish elaborate ask ai selection toolbar chat",
        body: (
          <>
            <p>
              Select some text and a small toolbar appears above it:
            </p>
            <KV
              rows={[
                { label: "💬 Ask AI", value: "Type any instruction — rewrite, translate, convert, anything" },
                { label: "⚡ Polish", value: "Clearer wording, same intent" },
                { label: "➕ Elaborate", value: "Expand the selection with more depth and detail" },
              ]}
            />
            <p>
              All three need text highlighted first — the toolbar only appears while something is
              selected.
            </p>
            <Callout type="tip">
              Every action opens a diff review before anything touches your note — red for removed, green
              for added — then Replace, Insert Below, or Cancel. Nothing is applied without a confirmed
              review.
            </Callout>
          </>
        ),
      },
      {
        id: "repurpose-note",
        title: "Repurpose a note",
        lead: "Turn the note you're editing into a blog post, social post, or newsletter draft — as new files, with the source note left untouched.",
        keywords: "repurpose content creator blog social newsletter draft format capture pipeline",
        body: (
          <>
            <p>
              Run <strong>Repurpose note into blog / social / newsletter draft…</strong> from the
              command palette (only visible once a key is configured, and only with an open note
              that has content).
            </p>
            <p>
              Pick one or more target formats, then <strong>Draft</strong>. The AI drafts each
              selected format from the current note's content and shows every draft for review
              before anything is saved.
            </p>
            <p>
              Confirming writes one new file per format, named after the source note (e.g.{" "}
              <code>pricing-launch-blog.md</code>, <code>pricing-launch-social.md</code>). The
              original note is never modified.
            </p>
            <Callout type="tip">
              This is a single in-app action instead of a manual prompt — the AI drafts every format
              in one pass and nothing is written until you confirm.
            </Callout>
          </>
        ),
      },
      {
        id: "privacy-model",
        title: "Privacy model",
        lead: "No AI request leaves your machine unless you've configured a key, and the key itself never touches HermesMarkdown's servers at rest.",
        keywords: "privacy data storage local server proxy",
        body: (
          <>
            <p>
              HermesMarkdown is local-first: your vault is read and written directly from the browser,
              with no upload step and no HermesMarkdown database holding your notes.
            </p>
            <KV
              rows={[
                { label: "Vault files", value: "Never leave your machine" },
                { label: "App settings (theme, font, sidebar width)", value: "Browser localStorage / IndexedDB" },
                { label: "AI API key", value: "Browser localStorage" },
              ]}
            />
            <Callout type="note">
              Without an AI key configured, no note content is ever sent anywhere. Every AI action is
              triggered manually — nothing runs on its own.
            </Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        id: "appearance",
        title: "Appearance",
        lead: "Theme, type size, line height, letter spacing, and typeface are independent settings — each one editable on its own.",
        keywords: "theme dark light font typography size",
        body: (
          <>
            <p>
              Dark/light theme is a single toggle in Settings → Interface. Type settings live in Settings
              → Typography.
            </p>
            <KV
              rows={[
                { label: "Dark theme", value: "Settings → Interface" },
                { label: "Text size", value: "Compact / Standard / Large / XL" },
                { label: "Line height", value: "Normal / Relaxed / Loose" },
                { label: "Letter spacing", value: "Normal / Wide" },
                { label: "Typeface", value: "IBM Plex Mono, Space Mono, IBM Plex Sans, Literata (Serif)" },
              ]}
            />
            <Callout type="note">
              Line height only offers the default or looser — the highlighted overlay and the underlying
              textarea have to stay pixel-aligned, so tighter values aren't exposed.
            </Callout>
          </>
        ),
      },
      {
        id: "editor-width",
        title: "Editor width",
        lead: "Standard or Narrow sets the maximum line width of the editor column.",
        keywords: "width standard narrow column breakpoint",
        body: (
          <>
            <p>Settings → Editor → Display → Editor Width.</p>
            <KV
              rows={[
                { label: "Standard", value: "Wider column, more characters per line" },
                { label: "Narrow", value: "Prose-width column" },
                { label: "Below the medium breakpoint", value: "Full width, setting ignored" },
              ]}
            />
          </>
        ),
      },
      {
        id: "keybindings",
        title: "Keybindings",
        lead: "Shortcuts are fixed — there's no remapping screen yet.",
        keywords: "keybindings remap customize shortcuts",
        body: (
          <>
            <p>
              Every shortcut in HermesMarkdown is built in and not user-configurable. See{" "}
              <a href="#keyboard-shortcuts" className="text-sage font-semibold hover:underline">Keyboard shortcuts</a>{" "}
              for the full reference grouped by context.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "mobile",
    label: "Mobile",
    items: [
      {
        id: "mobile-layout",
        title: "Mobile layout",
        lead: "Below a 768px viewport, the sidebar and tab bar are replaced by a fixed file indicator bar and full-screen overlays.",
        keywords: "mobile overlay breakpoint chrome command palette file indicator",
        body: (
          <>
            <p>
              A thin bar stays fixed at the top of the screen showing the active file's name and save
              status — there's no keyboard shortcut for the command palette on mobile, so tapping this
              bar is the one always-present way to open it. From there, Open Files, Search, Open Tasks,
              New file, and every other command work exactly as they do on desktop.
            </p>
            <p>Files and Search open as full-screen overlays rather than a docked sidebar panel.</p>
          </>
        ),
      },
      {
        id: "table-editor-mobile",
        title: "Table editor on mobile",
        lead: "Tables edit in place, same as desktop — only the frontmatter panel switches to a bottom sheet.",
        keywords: "table bottom sheet mobile drag frontmatter",
        body: (
          <>
            <p>
              Tables use the same floating toolbar and in-place cell editing as desktop — there's no
              separate view to switch to. Tapping the frontmatter ✎ icon instead slides a sheet up from
              the bottom edge, capped to a portion of the screen height so the soft keyboard never covers
              it. Drag the handle down to dismiss.
            </p>
            <p>
              Cell navigation and range selection work the same as desktop — only the surrounding chrome
              changes.
            </p>
          </>
        ),
      },
      {
        id: "differences-from-desktop",
        title: "Differences from desktop",
        lead: "Mobile trades some desktop-only surfaces for touch-first equivalents — the underlying editing model is unchanged.",
        keywords: "mobile desktop differences selection toolbar",
        body: (
          <>
            <KV
              rows={[
                { label: "Sidebar", value: "Floating button + full-screen overlays" },
                { label: "Frontmatter panel", value: "Bottom sheet, not centered dialog" },
                { label: "Selection toolbar", value: "Bold, Italic, Link only" },
              ]}
            />
            <p>
              On desktop, selecting text surfaces a toolbar with Ask AI, Polish, and Elaborate. On
              mobile, the equivalent toolbar is pared down to Bold, Italic, and Link — there's no
              per-selection AI toolbar on mobile yet. AI Chat and Repurpose Note are still reachable from
              the command palette on either platform.
            </p>
          </>
        ),
      },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));

/* ── Background graphics (kept from the previous page) ───────────────── */

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-neutral-500/[0.03] dark:bg-neutral-400/[0.02] blur-[120px]" />
  </div>
);

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Documentation() {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setScrollProgress(scrollHeight > 0 ? scrollTop / scrollHeight : 0);

      for (const id of [...ALL_IDS].reverse()) {
        const target = document.getElementById(id);
        if (target && target.getBoundingClientRect().top <= 120) {
          setActiveId(id);
          return;
        }
      }
      setActiveId("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const q = query.trim().toLowerCase();

  const matches = (item: Subsection) => {
    if (!q) return true;
    const haystack = `${item.title} ${item.lead} ${item.keywords || ""}`.toLowerCase();
    return haystack.includes(q);
  };

  const visibleGroups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: g.items.filter(matches) })).filter((g) => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  );

  const navLinkClasses = (id: string) =>
    `block text-ui-subhead font-medium py-1.5 px-3 rounded-lg transition-all duration-200 ${
      activeId === id
        ? "text-sage dark:text-sage bg-blue-50 dark:bg-sage/10"
        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
    }`;

  const navContent = (
    <nav className="space-y-6 w-full" aria-label="Table of contents">
      <div className="relative">
        <HiOutlineSearch
          size={14}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
          autoComplete="off"
          aria-label="Search documentation"
          className="w-full h-9 pl-8 pr-3 text-ui-footnote bg-paper-light dark:bg-paper-dark-surface/50 border border-edge rounded-full outline-none focus:ring-2 focus:ring-sage/20 text-ink-light dark:text-ink-dark placeholder:text-stone"
        />
      </div>

      {visibleGroups.map((g) => (
        <div key={g.id} className="space-y-1">
          <span className="block text-ui-callout font-bold tracking-tight text-ink-light dark:text-ink-dark px-3 mb-2">
            {g.label}
          </span>
          {g.items.map((item) => (
            <a key={item.id} href={`#${item.id}`} onClick={() => setMobileNavOpen(false)} className={navLinkClasses(item.id)}>
              {item.title}
            </a>
          ))}
        </div>
      ))}

      {q && visibleGroups.length === 0 && (
        <p className="text-ui-footnote text-stone px-3 italic">No matches for &quot;{query}&quot;.</p>
      )}
    </nav>
  );

  return (
    <main className="selection:bg-sage/30 overflow-x-clip font-sans relative">
      <div
        className="fixed top-0 left-0 h-px bg-neutral-400 dark:bg-neutral-600 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <BackgroundGraphics />

      {/* Persistent navigation — always reachable, regardless of scroll position */}
      <div className="fixed top-4 right-4 sm:right-6 z-40 flex items-center gap-1 p-1 rounded-full bg-surface/90 dark:bg-paper-dark/90 backdrop-blur-xl border border-edge shadow-lg">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="w-10 h-10 rounded-full flex items-center justify-center text-fg-muted hover:text-sage hover:bg-sage/10 transition-colors"
        >
          <HiOutlineHome size={18} />
        </Link>
        <Link
          href="/editor"
          aria-label="Go to editor"
          className="w-10 h-10 rounded-full flex items-center justify-center text-fg-muted hover:text-sage hover:bg-sage/10 transition-colors"
        >
          <HiOutlinePencilAlt size={18} />
        </Link>
      </div>

      {/* Mobile nav toggle */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open table of contents"
        className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-sage text-white flex items-center justify-center shadow-lg"
      >
        <HiOutlineMenu size={20} />
      </button>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-surface dark:bg-paper-dark overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close table of contents"
              className="absolute top-4 right-4 text-stone"
            >
              <HiOutlineX size={20} />
            </button>
            <div className="mt-10">
              {navContent}
            </div>
          </div>
        </div>
      )}

      <div className="container pt-20 lg:pt-32 pb-20 lg:pb-32 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

        <aside className="hidden lg:flex w-52 xl:w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto p-1.5">
          {navContent}
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-20 lg:space-y-24">

          <section className="space-y-8 animate-hero-fade-in">
            <Button
              variant="tertiary"
              onClick={() => router.back()}
              className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
            >
              ← Back
            </Button>
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-8xl font-bold tracking-tight leading-[1.05]">
                Product{" "}
                <span className="text-neutral-600 dark:text-neutral-400 italic font-serif">Documentation.</span>
              </h1>
            </div>
            <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
              How HermesMarkdown works, feature by feature. Plain <code className="text-[0.75em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">.md</code> files, a minimalist writing surface, and optional AI assistance when you want it. Works offline, saves straight to your machine.
            </p>
          </section>

          {visibleGroups.map((group) => (
            <section key={group.id} className="space-y-10 lg:space-y-12 border-t border-black/5 dark:border-white/10 pt-16 lg:pt-20">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{group.label}</h2>

              <div className="space-y-14 lg:space-y-16">
                {group.items.map((item) => {
                  const highlight = q && matches(item);
                  return (
                    <article
                      key={item.id}
                      id={item.id}
                      className={`scroll-mt-24 space-y-4 max-w-3xl rounded-2xl transition-all ${
                        highlight ? "ring-2 ring-sage/30 bg-sage/[0.03] -mx-2 px-2 sm:-mx-4 sm:px-4 py-4" : ""
                      }`}
                    >
                      <h3 className="text-lg md:text-xl font-medium tracking-tight">{item.title}</h3>
                      <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">{item.lead}</p>
                      <div className="space-y-5 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:tracking-tight [&_p]:text-neutral-500 [&_p]:dark:text-neutral-400 [&_p]:leading-relaxed [&_p]:text-base [&_p]:break-words [&_li]:break-words">
                        {item.body}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

        </div>
      </div>
    </main>
  );
}
