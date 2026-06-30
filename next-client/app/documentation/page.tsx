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
  const styles = {
    note: "bg-blue-500/5 dark:bg-blue-900/10 border-blue-500/10 text-blue-700 dark:text-blue-400/80",
    warning: "bg-amber-500/5 dark:bg-amber-900/10 border-amber-500/10 text-amber-700 dark:text-amber-400/70",
    tip: "bg-emerald-500/5 dark:bg-emerald-900/10 border-emerald-500/10 text-emerald-700 dark:text-emerald-400/80",
  };
  const labels = { note: "Note", warning: "Warning", tip: "Tip" };
  return (
    <div className={`p-5 border rounded-2xl text-sm leading-relaxed ${styles[type]}`}>
      <span className="block text-ui-footnote uppercase tracking-[0.2em] font-bold mb-2 opacity-80">{labels[type]}</span>
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
        keywords: "vault folder open dropbox icloud sync schema hermes",
        body: (
          <>
            <p>Click the vault icon in the sidebar and pick an existing folder, or create a new one in the picker.</p>
            <p>
              The browser grants HermesMarkdown direct read/write access to that folder for the
              session. Nothing is uploaded — files stay where they are on disk.
            </p>
            <p>Opening a folder for the first time adds one hidden directory:</p>
            <Code>{`.hermes/
  schema.yaml
  AGENTS.md
  template.md`}</Code>
            <p>
              These three files are generated once, on first open — see{" "}
              <a href="#hermes-architecture" className="text-sage font-semibold hover:underline">.hermes/ architecture</a>.
              Everything else in the folder — your notes, your subfolders — is yours; HermesMarkdown never
              restructures it.
            </p>
            <Callout type="warning">
              Dropbox and iCloud can lock files mid-sync. If saves start failing inside a synced folder,
              pause the sync client and retry.
            </Callout>
          </>
        ),
      },
      {
        id: "agent-context",
        title: "Set up agent context",
        lead: "The .hermes/ folder is what lets a coding agent skim your vault instead of reading every file in full.",
        keywords: "agent context settings guide install AGENTS.md",
        body: (
          <>
            <p>
              <code>.hermes/</code> is a hidden folder created the first time you open a vault. It holds
              a schema, an agent-facing reference doc, and a frontmatter template — nothing that touches
              your notes' content.
            </p>
            <p>
              An agent pointed at your vault reads <code>.hermes/AGENTS.md</code> first. From there it
              knows the frontmatter schema and can build an index of every file's <code>scope</code> and{" "}
              <code>read_when</code> field without opening the files themselves — the basis of the
              three-tier read protocol described in{" "}
              <a href="#agent-context-protocol" className="text-sage font-semibold hover:underline">Agent context protocol</a>.
            </p>
            <KV
              rows={[
                { label: "Where it's set up", value: "Settings → Guide" },
                { label: "Action", value: "Check & Install" },
                { label: "Re-run anytime", value: "Safe — won't overwrite your notes" },
              ]}
            />
            <Callout type="note">
              Skipping this step doesn't break anything. Your vault still works, and you can still write
              frontmatter by hand — an agent just has to read full files instead of scope summaries.
            </Callout>
          </>
        ),
      },
      {
        id: "first-note",
        title: "Your first note",
        lead: "New File opens a blank Markdown file with a frontmatter wizard ready to fill in.",
        keywords: "new file wizard title status save autosave",
        body: (
          <>
            <p>Use the + button in the sidebar, or run New file from the command palette.</p>
            <p>
              A wizard opens automatically on every new file, prompting for the fields defined in your
              vault's schema — <code>title</code>, <code>status</code>, and whatever else you've
              configured. Fill in what's relevant and skip the rest; nothing here is required beyond{" "}
              <code>title</code>.
            </p>
            <KV
              rows={[
                { label: "title", value: "Required" },
                { label: "status", value: "Defaults to draft" },
                { label: "Everything else", value: "Optional" },
              ]}
            />
            <Callout type="tip">
              Closed the wizard without finishing? Click the ✎ icon in the frontmatter header to reopen
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
        keywords: "sidebar icon rail pin pane split toolbar",
        body: (
          <>
            <p>
              There's no formatting toolbar above the text. Formatting happens through Markdown syntax,
              keyboard shortcuts, and the slash command menu.
            </p>
            <p>
              A thin icon rail sits at the left edge. Hover it to peek at the sidebar (files, search,
              smart workspaces); pin it open with <code>CTRL+SHIFT+E</code> when you need it visible
              while you work.
            </p>
            <KV
              rows={[
                { label: "Sidebar", value: "Hover edge / CTRL+SHIFT+E" },
                { label: "Command Palette", value: "CTRL+SHIFT+P" },
                { label: "Document Info", value: "CTRL+SHIFT+I" },
                { label: "AI Builder", value: "CTRL+SHIFT+B" },
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
                  { label: "Open link pill", shortcut: "CTRL+ENTER" },
                  { label: "Expand date picker", shortcut: "ALT+↓" },
                  { label: "Toggle sidebar", shortcut: "CTRL+SHIFT+E" },
                  { label: "Document info", shortcut: "CTRL+SHIFT+I" },
                  { label: "AI Builder", shortcut: "CTRL+SHIFT+B" },
                  { label: "Dismiss / close", shortcut: "ESCAPE" },
                ],
              },
              {
                context: "Table",
                rows: [
                  { label: "Move between cells", shortcut: "TAB / SHIFT+TAB / ARROWS" },
                  { label: "Edit focused cell", shortcut: "ENTER" },
                  { label: "Select a range", shortcut: "SHIFT+CLICK / SHIFT+ARROWS" },
                  { label: "Start a formula", shortcut: "TYPE =" },
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
        lead: "One view, not two — the editor highlights Markdown inline over the raw text instead of switching between source and preview.",
        keywords: "preview rendering inline width narrow standard",
        body: (
          <>
            <p>
              What you see is the file's actual content — headings, bold, links, and lifecycle tags are
              rendered inline over the text you're typing, not in a separate pane. There's nothing to
              toggle between.
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
        lead: "Click inside a pipe table for a floating toolbar, or open the dialog for spreadsheet-style editing with live formulas.",
        keywords: "table formula sum average csv sort alignment a1",
        body: (
          <>
            <p>
              Type <code>/table</code> in the slash menu, or the <code>{"{table}"}</code> shortcode. Both
              drop a 3×2 starter table with the cursor in the first cell.
            </p>
            <p>Click inside any table to get a floating toolbar over it.</p>
            <KV
              rows={[
                { label: "Advanced edit", value: "Open the dialog" },
                { label: "Delete table", value: "× in toolbar" },
                { label: "CSV export", value: "CSV in toolbar" },
              ]}
            />
            <p>
              The dialog is a spreadsheet-style grid: A1-style column letters and row numbers stay
              visible while you scroll, the active cell gets a green border, and rows/columns are added
              or removed from a toolbar — never inline, so you can't delete one by accident while
              scrolling.
            </p>
            <KV
              rows={[
                { label: "Cell navigation", value: "Tab / Shift+Tab / Arrows" },
                { label: "Select a cell", value: "Click" },
                { label: "Edit a cell", value: "Double-click or Enter" },
                { label: "Select a range", value: "Shift+Click / Shift+Arrows" },
                { label: "New row at end", value: "Enter on last row" },
              ]}
            />
            <p>
              Smart sorting recognizes dates, currency, and plain numbers regardless of column
              alignment. Output stays clean, auto-padded Markdown that respects left, center, or right
              alignment markers.
            </p>
            <p>
              Any cell starting with <code>=</code> is a live formula, using A1 references —{" "}
              <code>B2</code>, <code>B2:D2</code> — the same as a spreadsheet. The computed value
              renders live in both the editor and the dialog; the formula itself is what's saved to the
              file.
            </p>
            <Code>{`| Item | Amount             |
| ---- | ------------------- |
| Rent | $2,000              |
| Food | $400                |
|      | =SUM(B2:B3) → $2,400 |`}</Code>
            <p>
              Referenced cells can hold <code>2000</code>, <code>$2,000</code>, or{" "}
              <code>2,000 RON</code> — any placement, with or without a space — and still resolve as a
              number. The result formats back as that same currency automatically; summing a column of
              RON values produces a RON total with no currency setting required.
            </p>
            <p>
              In the dialog, typing <code>=</code> into a cell switches into point mode: click another
              cell to insert its reference, Shift+click for a range, or a column letter for the whole
              column — without losing your place in the formula.
            </p>
            <KV
              rows={[
                { label: "calc(100+50)=", value: "150" },
                { label: "Insert =SUM(...) row", value: "Σ in dialog toolbar" },
              ]}
            />
            <Callout type="tip">
              Functions: SUM · AVERAGE · MIN · MAX · COUNT · COUNTA · ABS · ROUND · IF · AND · OR · NOT ·
              CONCAT.
            </Callout>
          </>
        ),
      },
      {
        id: "frontmatter-panel",
        title: "Frontmatter panel",
        lead: "A structured form over the YAML block at the top of a file — edit fields without writing YAML by hand.",
        keywords: "yaml schema panel sheet mobile",
        body: (
          <>
            <p>
              Click the ✎ icon in a document's frontmatter header to open the panel. It also opens
              automatically as the wizard on new files.
            </p>
            <p>
              The panel renders whatever fields your vault's schema defines — by default{" "}
              <code>title</code>, <code>status</code>, <code>scope</code>, <code>read_when</code>,{" "}
              <code>related</code>, <code>tags</code>, and <code>edit_elsewhere</code>. Field types
              (text, list, enum) come from <code>.hermes/schema.yaml</code>, so a custom schema changes
              what the panel shows.
            </p>
            <p>
              Every change in the panel writes straight back to the YAML block at the top of the file —
              there's no separate save step for frontmatter and no risk of the panel and the raw block
              drifting apart.
            </p>
            <Callout type="note">
              On a mobile screen, the panel uses the same bottom-sheet layout as the table dialog, to
              stay clear of the soft keyboard.
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
              Insert one from the slash menu with <code>/callout</code>, which defaults to{" "}
              <code>note</code>.
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
              map to <code>abstract</code>; <code>caution</code> and <code>attention</code> map to{" "}
              <code>warning</code>; <code>error</code> maps to <code>danger</code>. An unrecognized type
              falls back to the <code>note</code> style with your own label.
            </Callout>
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
              there's no command-only behavior.
            </p>
            <KV
              rows={[
                { label: "Save", value: "CTRL+S" },
                { label: "New file", value: "—" },
                { label: "Export current file", value: "—" },
                { label: "Toggle sidebar", value: "CTRL+SHIFT+E" },
                { label: "Switch theme", value: "—" },
                { label: "Open settings", value: "—" },
                { label: "Open vault", value: "—" },
                { label: "New folder", value: "When a vault is open" },
                { label: "Document info", value: "CTRL+SHIFT+I" },
                { label: "Open AI Builder", value: "CTRL+SHIFT+B · when AI is configured" },
                { label: "Focus editor", value: "—" },
                { label: "Close current tab", value: "—" },
                { label: "Close all tabs", value: "—" },
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
        lead: "A vault is a folder. HermesMarkdown adds one hidden directory to it and otherwise leaves your files alone.",
        keywords: "directory structure plain files lock-in",
        body: (
          <>
            <p>
              Any folder you open becomes a vault. Subfolders, file names, and organization are entirely
              yours — HermesMarkdown doesn't enforce a structure or move files around.
            </p>
            <Code>{`my-vault/
  .hermes/          ← created by HermesMarkdown
    schema.yaml
    AGENTS.md
    template.md
  projects/         ← yours
    roadmap.md
  daily/            ← yours
    2026-06-25.md`}</Code>
            <KV
              rows={[
                { label: ".hermes/schema.yaml", value: "Generated" },
                { label: ".hermes/AGENTS.md", value: "Generated" },
                { label: ".hermes/template.md", value: "Generated" },
                { label: ".hermes/index.yaml", value: "Generated on demand" },
                { label: "Everything else", value: "Yours" },
              ]}
            />
            <p>
              Every note is a plain <code>.md</code> file with YAML frontmatter. Open the folder in any
              other editor, sync it with Dropbox or Google Drive, or move it to another machine — nothing
              about it depends on HermesMarkdown being installed.
            </p>
          </>
        ),
      },
      {
        id: "hermes-architecture",
        title: ".hermes/ architecture",
        lead: "Four files, generated into a hidden folder, that let an agent understand your vault without opening every note.",
        keywords: "schema.yaml AGENTS.md template.md index.yaml stale",
        body: (
          <>
            <h4 className="text-lg font-bold tracking-tight !mb-2">schema.yaml</h4>
            <p>
              The frontmatter schema for this vault — which fields exist, their types, and their
              defaults. Edit it from Settings → Schema; every new note's frontmatter wizard reads from
              it.
            </p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">AGENTS.md</h4>
            <p>
              An agent-facing reference: the current schema (with a hash so an agent can detect drift),
              field-by-field documentation, and a tree of the vault's structure. This is the file an
              agent is expected to read first.
            </p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">template.md</h4>
            <p>A frontmatter block pre-filled with this schema's default values, used when creating new files programmatically.</p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">index.yaml</h4>
            <p>
              Built on demand, not stored permanently — a flat list of every file in the vault with just
              its frontmatter: path, title, status, scope, read_when, related, tags. No file body
              content.
            </p>
            <Code>{`generated: 2026-06-25T10:03:00Z
files:
  - path: projects/roadmap.md
    title: Roadmap
    status: active
    scope: "Q3 priorities and current blockers"
    read_when: "keywords: roadmap, priorities, planning"
    tags: [project]`}</Code>
            <Callout type="note">
              <code>index.yaml</code> carries a <code>generated</code> timestamp. An agent that finds it
              more than five minutes old should treat it as possibly stale and regenerate before relying
              on it.
            </Callout>
          </>
        ),
      },
      {
        id: "frontmatter-conventions",
        title: "Frontmatter conventions",
        lead: "The default schema's fields, their types, and what each is for — all optional except title.",
        keywords: "title status scope read_when related tags edit_elsewhere",
        body: (
          <>
            <KV
              rows={[
                { label: "title", value: "string · required" },
                { label: "status", value: "enum · default draft" },
                { label: "scope", value: "string · optional" },
                { label: "read_when", value: "list · optional" },
                { label: "related", value: "list · optional" },
                { label: "tags", value: "list · optional" },
                { label: "edit_elsewhere", value: "list · optional" },
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
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">scope</h4>
            <p>
              A one-line summary written for an agent, not a human. This is what gets loaded at Tier 1 of
              the agent context protocol, before any agent opens the full file.
            </p>
            <Code>{`scope: "Pricing decisions for the Q3 launch, not engineering details"`}</Code>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">read_when</h4>
            <p>Controls whether an agent loads this file at all. Accepts:</p>
            <KV
              rows={[
                { label: "A plain sentence", value: "Matched semantically" },
                { label: '"keywords: a, b, c"', value: "Matched by keyword" },
                { label: '"always"', value: "Always loaded" },
                { label: '"never"', value: "Always skipped" },
              ]}
            />
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">related</h4>
            <p>
              Wikilinks to other notes worth checking alongside this one — <code>[[Note Name]]</code>{" "}
              entries that an agent can follow without re-deriving the relationship from content.
            </p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">tags</h4>
            <p>Free-form domain tags, distinct from the lifecycle tag that mirrors <code>status</code>.</p>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">edit_elsewhere</h4>
            <p>
              External locations this note's content is duplicated to or sourced from — a flag so an
              agent doesn't treat this file as the single source of truth.
            </p>
            <Callout type="tip">
              None of this is fixed. The schema in <code>.hermes/schema.yaml</code> is editable from
              Settings → Schema — drop fields you don't use, rename them, or add your own.
            </Callout>
          </>
        ),
      },
      {
        id: "agent-context-protocol",
        title: "Agent context protocol",
        lead: "Three tiers — skip, scope-only, full load — let an agent traverse a large vault without reading every file.",
        keywords: "tier protocol index.yaml read_when scope never",
        body: (
          <>
            <ol className="space-y-4 list-decimal list-outside pl-5 marker:font-bold marker:text-sage dark:marker:text-sage text-neutral-500 dark:text-neutral-400 leading-relaxed text-base">
              <li>
                <span className="font-bold tracking-tight text-ink-light dark:text-ink-dark">Filter by read_when.</span>{" "}
                An agent starts at <code>.hermes/index.yaml</code>, not the vault's files. For each entry,
                it checks <code>read_when</code>: an empty value, an unmatched query context, or an
                explicit <code>"never"</code> means the file is skipped entirely — Tier 0.
              </li>
              <li>
                <span className="font-bold tracking-tight text-ink-light dark:text-ink-dark">Load scope only.</span>{" "}
                For files that pass the filter, the agent reads only the <code>scope</code> field from the
                index — Tier 1. If that one-line summary is enough to answer the task at hand, the agent
                stops there without opening the file.
              </li>
              <li>
                <span className="font-bold tracking-tight text-ink-light dark:text-ink-dark">Load full content.</span>{" "}
                Only when <code>scope</code> is missing or insufficient does the agent open the file in
                full — Tier 2. This is the expensive path, reserved for files the earlier tiers couldn't
                resolve.
              </li>
            </ol>
            <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">How to write for it</h4>
            <p>
              Write <code>scope</code> as if an agent will never read past it. Use <code>read_when</code>{" "}
              to rule files out explicitly — a stale meeting note marked <code>read_when: never</code>{" "}
              never costs a Tier 2 load, no matter how it's named or where it sits in the vault.
            </p>
            <Code>{`---
title: Q2 Retro
status: archived
scope: "Closed-out retro notes, superseded by Q3 planning"
read_when: never
---`}</Code>
            <Callout type="note">
              This protocol is what <code>.hermes/index.yaml</code> exists to serve. Without it, an agent
              has no shortcut and falls back to reading files directly.
            </Callout>
          </>
        ),
      },
      {
        id: "hermes-md-vs-agents-md",
        title: "Is hermes.md the same as HermesMarkdown's vault system?",
        lead: "No — the hermes.md convention belongs to a different project. Here's the short version.",
        keywords: "hermes.md .hermes.md NousResearch disambiguation agent context",
        body: (
          <>
            <p>
              <code>hermes.md</code> and <code>.hermes.md</code> are project-context filenames used by{" "}
              <strong>Hermes Agent</strong> (NousResearch) and compatible AI coding tools. They serve the
              same conceptual purpose as <code>CLAUDE.md</code> or <code>.cursorrules</code> — a file placed
              in a repo so an agent starts with context about the codebase. They are not part of HermesMarkdown.
            </p>
            <p>
              HermesMarkdown uses a different system: a <code>.hermes/</code> folder (not a single file)
              generated inside any vault you open, containing <code>AGENTS.md</code>,{" "}
              <code>index.yaml</code>, and <code>schema.yaml</code>. See{" "}
              <a href="#hermes-architecture" className="text-sage font-semibold hover:underline">
                .hermes/ architecture
              </a>{" "}
              and{" "}
              <a href="#agent-context-protocol" className="text-sage font-semibold hover:underline">
                Agent context protocol
              </a>{" "}
              above for how that system works.
            </p>
            <p>
              For the full explanation of the naming overlap and why "hermes.md file" searches spiked, see{" "}
              <a href="/what-is-hermes-md" className="text-sage font-semibold hover:underline">
                What is a hermes.md file?
              </a>
            </p>
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
        lead: "Selection-based commands rewrite what you've highlighted; a few others work from a typed instruction or the surrounding note instead.",
        keywords: "improve writing tone summarize extract tasks outline title continue explain builder",
        body: (
          <>
            <p>
              Type <code>/</code> and pick a command from the AI group — only visible once a key is
              configured.
            </p>
            <KV
              rows={[
                { label: "🧱 AI Builder", value: "Create or revise a section, then review" },
                { label: "✨ Improve writing", value: "Clearer wording, same intent" },
                { label: "✅ Fix spelling & grammar", value: "Light correction pass" },
                { label: "✂️ Shorten", value: "Compress verbose text" },
                { label: "➕ Expand", value: "Elaborate on terse text" },
                { label: "🎩 Change tone", value: "Formal · Casual · Direct · Polished" },
                { label: "📃 Summarize", value: "Concise recap" },
                { label: "🗒️ Extract tasks", value: "Convert to a checklist" },
                { label: "📑 Create outline", value: "Headings and bullets" },
                { label: "🏷️ Generate title", value: "From the note or selection" },
                { label: "➡️ Continue writing", value: "From the cursor, using nearby context" },
                { label: "❓ Explain selection", value: "Plain-language recap" },
              ]}
            />
            <p>
              Selection-based commands need text highlighted first. AI Builder, Generate title, and
              Continue writing work without a selection — they read the surrounding note instead.
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
                { label: "Text size", value: "S / M / L / XL" },
                { label: "Line height", value: "Normal / Relaxed / Loose" },
                { label: "Letter spacing", value: "Normal / Wide" },
                { label: "Typeface", value: "System Mono, JetBrains Mono, Fira Code, IBM Plex Mono, Journal (Serif)" },
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
        lead: "Below a 768px viewport, the sidebar and tab bar are replaced by a bottom nav and full-screen overlays.",
        keywords: "mobile bottom nav overlay breakpoint chrome",
        body: (
          <>
            <p>
              The bottom nav gives four actions — Files, Search, New File, and Menu (the command
              palette) — and hides automatically whenever the on-screen keyboard is open, so it doesn't
              compete for space with the text you're typing.
            </p>
            <p>
              With more than one file open, a thin indicator bar above the editor shows the active file's
              name and expands into a switcher on tap.
            </p>
            <p>Files and Search open as full-screen overlays rather than a docked sidebar panel.</p>
          </>
        ),
      },
      {
        id: "table-editor-mobile",
        title: "Table editor on mobile",
        lead: "The table dialog and frontmatter panel both open as a bottom sheet instead of a centered dialog.",
        keywords: "table dialog bottom sheet mobile drag",
        body: (
          <>
            <p>
              Tapping into a table or the frontmatter ✎ icon slides a sheet up from the bottom edge,
              capped to a portion of the screen height so the soft keyboard never covers it. Drag the
              handle down to dismiss.
            </p>
            <p>
              Cell navigation, range selection, and the formula engine work the same as desktop — only
              the surrounding chrome changes.
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
                { label: "Sidebar", value: "Bottom nav + full-screen overlays" },
                { label: "Table dialog / frontmatter panel", value: "Bottom sheet, not centered dialog" },
                { label: "Selection toolbar", value: "Bold, Italic, Link only" },
              ]}
            />
            <p>
              On desktop, selecting text surfaces a toolbar with Improve Writing, Expand, and a free-form
              prompt action alongside formatting. On mobile, the equivalent toolbar is pared down to
              Bold, Italic, and Link — AI actions on a selection are reached through the slash menu or
              command palette instead.
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
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
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

  const NavContent = () => (
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
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans relative">
      <div
        className="fixed top-0 left-0 h-[2px] bg-sage z-50 transition-all duration-75"
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
              <NavContent />
            </div>
          </div>
        </div>
      )}

      <div className="container pt-20 lg:pt-32 pb-20 lg:pb-32 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

        <aside className="hidden lg:flex w-52 xl:w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto p-1.5">
          <NavContent />
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
              Plain <code className="text-[0.75em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">.md</code> files, structured for agents. Works offline, saves to your machine, and connects to Claude Code, Cowork, or any agent you use.
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
