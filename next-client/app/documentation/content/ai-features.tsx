import { Callout, Code, KV, type Group } from "../doc-primitives";
import TextLink from "@/app/components/TextLink";

// Documentation content: AI Features group.
export const aiFeaturesGroup: Group = {
  id: "ai-features",
  label: "AI Features",
  items: [
    {
      id: "byok-setup",
      title: "BYOK setup",
      lead: "AI is optional and off by default. Turn it on with your own Anthropic or Google Gemini key — there's no default model HermesMarkdown provides.",
      keywords: "byok api key anthropic gemini claude provider model enable disable turn on off",
      body: (
        <>
          <KV
            rows={[
              { label: "Anthropic Claude", value: "Models fetched from your account" },
              { label: "Google Gemini", value: "Models fetched from your account" },
            ]}
          />
          <p>
            AI is optional and off until you turn it on. Settings → AI Features → switch on{" "}
            <strong>AI features</strong>, pick a Provider (Claude or Gemini) and paste your API key. Then
            pick a Model (the refresh button reloads the list) and, if you like, <strong>Test connection</strong>.
            With a key set, the AI companion opens from <strong>Ask AI</strong> in the palette, the slash menu
            and the selection toolbar. With the switch off, none of them show.
          </p>
          <p>
            Nothing is sent until you use an AI feature. The key is stored in your browser. Each AI
            request passes through HermesMarkdown&apos;s servers on its way to Anthropic or Google — the
            key is never logged or saved there. See{" "}
            <TextLink href="#privacy-model">Privacy model</TextLink>{" "}
            for the full picture.
          </p>
          <Callout type="note">
            Switching AI features off keeps your key for later; <strong>Remove key</strong> in Settings →
            AI Features deletes it.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-companion",
      title: "The AI companion",
      lead: "One AI, in a panel beside your note. Ask it about your notes, or ask it to change them.",
      keywords: "ask ai companion panel chat selection toolbar ctrl cmd j attachments @file @folder @vault model new chat clear compact summarize conversation",
      body: (
        <>
          <p>
            Press <code>CTRL/CMD+J</code>, or choose <strong>Ask AI</strong> in the command palette, the
            slash menu or the toolbar that appears on a selection. On a phone, tap the AI button in the
            file bar. The panel opens on the right and the page moves over; drag its edge to make it
            wider. The note in front and your selection come along as chips above the message field.
            Remove a chip to leave it out.
          </p>
          <p>
            Type <code>@</code> to add another note, a folder or the whole vault. Attach images or files.
            Replies stream in as they&apos;re written, in Markdown. Pick the model from the panel&apos;s
            header. Start over with <strong>New chat</strong> (the chat bubble in the header, or type{" "}
            <code>/new</code> or <code>/clear</code>). When a conversation grows long,{" "}
            <strong>Summarize chat</strong> (or <code>/compact</code>, optionally followed by what to keep)
            replaces it with a short summary the companion goes on from. Both are also in the command
            palette as <em>New AI chat</em> and <em>Summarize AI chat</em>. The conversation stays when you
            close the panel or reload the page.
          </p>
          <p>
            Each thing the companion does shows as a quiet line in its reply, like{" "}
            <em>Read Projects/Roadmap.md</em> or <em>Edited Projects/Roadmap.md · 2 edits</em>.
          </p>
        </>
      ),
    },
    {
      id: "ai-companion-changes",
      title: "What the companion can change",
      lead: "It edits notes and code, makes files and folders, renames and moves them, and every change in a reply undoes together.",
      keywords: "ai edit change write code block file create folder rename move trash undo turn private",
      body: (
        <>
          <p>
            Ask for a change and the companion makes it: it reads the file first, then edits the exact
            text. It works on notes, on code and text files in your vault (<code>.py</code>,{" "}
            <code>.ts</code>, <code>.json</code>, …) and on a single code block in a note. It can create
            notes, files and folders, rename an item (links to it follow the new name) and move items
            into a folder (their links follow too). Changes save at once, and an open note shows them
            straight away.
          </p>
          <p>
            To move something to the Trash it asks first, in the thread: <strong>Keep</strong> leaves
            everything as it is, <strong>Move to Trash</strong> goes ahead. Items stay in the Trash for
            30 days.
          </p>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Undo</h4>
          <p>
            Under a reply that changed files you&apos;ll see what changed and <strong>Undo</strong>.
            It takes back everything that reply did at once, newest first: edits, new files and
            folders, renames, moves and the Trash. <code>CTRL/CMD+Z</code> in Files does the same, as
            for your own renames and moves. A file you&apos;ve edited since is left as it is, and the
            panel says which.
          </p>
          <Callout type="tip">
            Private notes (<code>private: true</code> or a <code>private</code> tag) are never read,
            edited, moved or put in the Trash by the companion, and the open note isn&apos;t added as
            a chip when it&apos;s private.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-templates",
      title: "AI templates",
      lead: "Ask the companion for a template and it saves one in _templates/, checked first.",
      keywords: "ai template skill create rfc prompt save",
      body: (
        <>
          <p>
            Ask for a template, for example &ldquo;make me an RFC template that asks for an
            owner&rdquo;, or start a message with <code>/template</code>. The companion loads its
            template skill, learns the <TextLink href="#templates">template tokens</TextLink> and
            saves the template itself, as <code>_templates/RFC.md</code> for example. They show up in{" "}
            <code>/template</code> straight away.
          </p>
          <p>
            Each template is checked before it&apos;s saved, for things like an unknown token or two{" "}
            <code>{"{{cursor}}"}</code>s. When there&apos;s a problem the companion fixes it and tries
            again; nothing is saved until it passes. It never replaces a template you have: ask it to
            change one and it edits that file. <strong>Undo</strong> under the reply removes a new
            template again. You need an open vault.
          </p>
        </>
      ),
    },
    {
      id: "ai-weekly-review-tasks",
      title: "Tasks and the companion",
      lead: "Ask about your tasks, and the companion works from your own open tasks.",
      keywords: "ai tasks todo action items plan day next skill command",
      body: (
        <>
          <p>
            Ask about your tasks, to-dos or action items, or start with <code>/tasks</code>, and
            the companion loads its tasks skill and sees your open tasks: in progress, to do and on hold,
            with their due dates, priorities and notes. Ask what to work on next, what&apos;s overdue,
            or paste meeting notes and ask for tasks. You get task lines with real{" "}
            <code>@due()</code> dates, worked out from today, and it can add them to a note or change
            a task&apos;s line where it is.
          </p>
          <Callout type="tip">
            Private notes (<code>private: true</code> or a <code>private</code> tag) are never sent. Their tasks are left out and
            only counted.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-code-skill",
      title: "Code and the companion",
      lead: "Ask about code, or start with /code, and the companion works like a careful code assistant.",
      keywords: "ai code coding assistant refactor review explain fix error stack trace unit tests code block skill command",
      body: (
        <>
          <p>
            Ask about code, a refactor, a stack trace or unit tests, or start with <code>/code</code>,
            and the companion loads its code skill and works on the code files in your vault and the code
            blocks in your notes. Ask it to explain, review or refactor, to fix an error you paste, or
            to write tests. Say &ldquo;this code&rdquo; and it looks at the file you have open and the
            block your cursor is in.
          </p>
          <p>
            It reads the whole file before it changes anything, keeps your style, and makes small edits
            rather than rewriting the file. The changes save at once, and Undo turn takes them all back.
            It can&apos;t run code, so it tells you what it couldn&apos;t check.
          </p>
        </>
      ),
    },
    {
      id: "ai-skill-notes",
      title: "Your own skills",
      lead: "Write a note of type skill, and the companion loads it when a request fits, or when you type /its-name.",
      keywords: "ai skill skills custom own instructions prompt command slash note type",
      body: (
        <>
          <p>
            Any note with <code>type: skill</code> in its frontmatter (or a <code>#type/skill</code> tag)
            is a skill, wherever it is in your vault. Start a message to the companion with a slash and the
            note&apos;s file name, lowercase with hyphens for spaces (<code>Standup notes.md</code> is{" "}
            <code>/standup-notes</code>), and the note&apos;s text below its frontmatter goes with that
            message. Give it a <code>description</code> saying when to use it, and the companion loads
            the skill by itself whenever a request fits.
          </p>
          <Code>{`---
type: skill
description: Write my daily standup from my notes
---
Write today's standup from my notes: done, next, blocked. Keep each to one line.`}</Code>
          <p>
            The companion sees only each skill&apos;s name and description until it loads one, so
            having many skills costs nothing. The note is read fresh each time, so edits apply at once. The app never creates or
            changes skill notes. <code>/template</code>, <code>/tasks</code> and <code>/code</code> are the app&apos;s own skills.
          </p>
        </>
      ),
    },
    {
      id: "ai-chat-tools",
      title: "How the companion looks things up",
      lead: "With a vault open, the companion reads your notes and files instead of guessing.",
      keywords: "ai tools search notes read note file folder open tasks overdue due today agent",
      body: (
        <>
          <p>
            It can <strong>search your notes</strong> (by text, name or tag), <strong>read a note or
            file</strong>, <strong>list a folder</strong>, look at <strong>the note you have open</strong>{" "}
            (your selection and the code block the cursor is in) and <strong>list your open
            tasks</strong>: all of them, in progress, due today, overdue or upcoming, or by tag.
          </p>
          <Callout type="tip">
            The lookups run in your browser, against your vault. Only what they find for a question goes
            to the AI, in the same request. Private notes are never searched or read.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-web-search",
      title: "Web search",
      lead: "With Claude, the companion can look things up online, and lists the pages it used.",
      keywords: "ai web search internet online lookup sources links current news",
      body: (
        <>
          <p>
            In Settings → AI Features, with Claude as the provider, turn on{" "}
            <strong>Let the companion search the web</strong>. It&apos;s off until you do. The companion then
            searches when a question needs current or outside information, shows each search as a line
            like <em>Searched the web for &ldquo;release date&rdquo;</em>, and lists the pages it drew on
            under its reply.
          </p>
          <p>
            Searches are run by Anthropic and billed on your key, up to five per reply. Web search must
            also be allowed for your key in the Anthropic Console. With Gemini it isn&apos;t offered yet.
          </p>
          <Callout type="note">
            What the companion searches for can quote your notes. Leave it off if that matters for what
            you keep in your vault; private notes are never read, so they can&apos;t be searched for.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-browser-agents",
      title: "Browser agents",
      lead: "AI agents built into your browser can use your notes too, if you let them. No key needed.",
      keywords: "webmcp browser agent model context tools read write",
      body: (
        <>
          <p>
            Some browsers have AI agents of their own that can use tools a page offers (WebMCP). In
            Settings → AI Features, <strong>Let browser agents read notes</strong> lets them search
            your notes, read one and list open tasks. It&apos;s off until you turn it on, and works
            without an AI key.
          </p>
          <p>
            With it on, <strong>Let browser agents change notes</strong> also lets them edit and
            create notes and files, make folders, rename and move them, and save templates, as the
            companion does. Each change shows a toast with <strong>Undo</strong>, and{" "}
            <code>CTRL/CMD+Z</code> in Files takes it back too. They can never use the Trash or touch
            private notes.
          </p>
        </>
      ),
    },
    {
      id: "ai-table-formulas",
      title: "AI & table formulas",
      lead: "The AI knows how table formulas work. It writes totals as live formulas and never replaces your formulas with numbers.",
      keywords: "ai formula sum average table total spreadsheet calculate",
      body: (
        <>
          <p>
            Ask the companion for a table with totals, averages or counts, and
            you get formulas like <code>=SUM(B2:B5)</code> in a totals row, not numbers the AI
            worked out itself. The table keeps computing correctly as you edit it. You can also ask
            it to add or fix a formula, or explain why a cell shows <code>#REF!</code> or{" "}
            <code>#CIRCULAR!</code>.
          </p>
          <p>
            Tables the AI writes keep their heading right above them, with any description below
            the table, so formulas such as <code>=SUM(Income!B)</code> can find them by name.
          </p>
          <p>
            When it edits a note, the companion is told to keep formulas exactly as written. It never
            swaps a <code>=SUM(...)</code> for its current result.
          </p>
          <Callout type="tip">
            When asking for changes that add or remove rows, check the totals row afterwards. The AI is
            asked to keep ranges in step, but the table&apos;s own <strong>Sum column</strong> action
            is the most reliable way to get a range that covers exactly the rows above.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-hermes-syntax",
      title: "AI & your notes' syntax",
      lead: "The AI writes tasks, links and callouts the way HermesMarkdown reads them, and keeps them intact when it rewrites text.",
      keywords: "ai tasks status box due priority started done wiki link tag callout syntax",
      body: (
        <>
          <p>
            The companion knows HermesMarkdown&apos;s own syntax. Tasks get their status in the box (<code>[ ]</code> <code>[/]</code>{" "}
            <code>[!]</code> <code>[x]</code> <code>[-]</code>), never a <code>#todo</code> tag, with{" "}
            <code>@due()</code> and <code>@priority()</code> at the end of the line. Links to other
            notes are <code>[[wiki links]]</code>, and callouts use the <code>&gt; [!tip]</code>{" "}
            form.
          </p>
          <p>
            When it edits a note it keeps task boxes, their <code>@started()</code> and{" "}
            <code>@done()</code> dates, links, tags and callout headers exactly as written.
          </p>
        </>
      ),
    },
    {
      id: "privacy-model",
      title: "Privacy model",
      lead: "No AI request leaves your machine unless you've configured a key, and the key itself is never stored on HermesMarkdown's servers.",
      keywords: "privacy data storage local server proxy",
      body: (
        <>
          <p>
            HermesMarkdown is local-first: your vault is read and written directly from the browser,
            with no upload step and no HermesMarkdown database holding your notes.
          </p>
          <KV
            rows={[
              { label: "Local vault files", value: "Never leave your machine" },
              { label: "AI requests", value: "Relayed to Anthropic / Google, not stored" },
              { label: "Web searches (when on)", value: "Run by Anthropic during the reply" },
              { label: "App settings (theme, font, editor layout)", value: "Browser localStorage / IndexedDB" },
              { label: "AI API key", value: "Browser localStorage" },
              { label: "Companion conversation", value: "Browser localStorage (New chat clears it)" },
            ]}
          />
          <Callout type="note">
            Without an AI key configured, no note content is ever sent anywhere. The companion only
            works when you send it a message — nothing runs on its own. Browser agents only get your
            notes if you turn them on in Settings.
          </Callout>
        </>
      ),
    },
  ],
};
