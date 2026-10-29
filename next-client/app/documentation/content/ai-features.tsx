import { Callout, KV, type Group } from "../doc-primitives";
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
      lead: "One AI, in a panel beside your file. Ask it about your files, or ask it to change them.",
      keywords: "ask ai companion panel chat selection toolbar ctrl cmd j attachments @file @folder @vault model new chat clear compact summarize conversation",
      body: (
        <>
          <p>
            Press <code>CTRL/CMD+J</code>, or choose <strong>Ask AI</strong> in the command palette, the
            slash menu or the toolbar that appears on a selection. On a phone, tap the AI button in the
            file bar. The panel opens on the right and the page moves over; drag its edge to make it
            wider. The file in front and your selection come along as chips above the message field.
            Remove a chip to leave it out.
          </p>
          <p>
            Type <code>@</code> to add another file, a folder or the whole vault. Attach images or files.
            Replies stream in as they&apos;re written, in Markdown. Pick the model from the panel&apos;s
            header. Type <code>/</code> to list the commands and pick one. Start over with{" "}
            <strong>New chat</strong> (the chat bubble in the header, or type{" "}
            <code>/new</code> or <code>/clear</code>). When a conversation grows long,{" "}
            <strong>Summarize chat</strong> (<code>/compact</code> or <code>/summarize</code>, optionally followed by what to keep)
            replaces it with a short summary the companion goes on from; Stop cancels a summary and keeps the conversation. Both are also in the command
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
      lead: "It proposes edits and new files for you to review, and renames, moves and organises files on request.",
      keywords: "ai edit change proposal review accept reject hunk apply file create folder rename move trash undo turn private",
      body: (
        <>
          <p>
            Ask for a change and the companion proposes it: it reads the file first, then drafts the
            exact edits. Nothing is written until you review the proposal, accept the changes you want
            and apply them. The same goes for new files and templates it suggests. It can also create
            folders, rename an item (links to it follow the new name) and move items into a folder
            (their links follow too); those save at once, and an open file shows them straight away.
          </p>
          <p>
            To move something to the Trash it asks first, in the thread: <strong>Keep</strong> leaves
            everything as it is, <strong>Move to Trash</strong> goes ahead. Items stay in the Trash for
            30 days.
          </p>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Undo</h4>
          <p>
            Under a reply that changed files you&apos;ll see what changed and <strong>Undo</strong>.
            It takes back everything that reply did at once, newest first: applied proposals, new
            folders, renames, moves and the Trash. <code>CTRL/CMD+Z</code> in Files does the same, as
            for your own renames and moves. A file you&apos;ve edited since is left as it is, and the
            panel says which.
          </p>
          <Callout type="tip">
            Private files (<code>private: true</code> or a <code>private</code> tag) are never read,
            edited, moved or put in the Trash by the companion, and the open file isn&apos;t added as
            a chip when it&apos;s private.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-templates",
      title: "AI templates",
      lead: "Ask the companion for a template and it saves one in _templates/, checked first.",
      keywords: "ai template create rfc prompt save",
      body: (
        <>
          <p>
            Ask for a template, for example &ldquo;make me an RFC template that asks for an
            owner&rdquo;. The companion knows the <TextLink href="#templates">template tokens</TextLink> and
            proposes the template, saved as <code>_templates/RFC.md</code> for example once you apply
            it. It shows up in <code>/template</code> straight away.
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
      id: "ai-chat-tools",
      title: "How the companion looks things up",
      lead: "With a vault open, the companion reads your files instead of guessing.",
      keywords: "ai tools search notes read note file folder open tasks overdue due today agent",
      body: (
        <>
          <p>
            It can <strong>search your files</strong> (by text, name or tag), <strong>read a
            file</strong>, <strong>list a folder</strong>, look at <strong>the file you have open</strong>{" "}
            (your selection and the code block the cursor is in) and <strong>list your open
            tasks</strong>: all of them, in progress, due today, overdue or upcoming, or by tag.
          </p>
          <Callout type="tip">
            The lookups run in your browser, against your vault. Only what they find for a question goes
            to the AI, in the same request. Private files are never searched or read.
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
            What the companion searches for can quote your files. Leave it off if that matters for what
            you keep in your vault; private files are never read, so they can&apos;t be searched for.
          </Callout>
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
            When it edits a file, the companion is told to keep formulas exactly as written. It never
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
      title: "AI & your files' syntax",
      lead: "The AI writes tasks, links and callouts the way HermesMarkdown reads them, and keeps them intact when it rewrites text.",
      keywords: "ai tasks status box due priority started done wiki link tag callout syntax",
      body: (
        <>
          <p>
            The companion knows HermesMarkdown&apos;s own syntax. Tasks get their status in the box (<code>[ ]</code> <code>[/]</code>{" "}
            <code>[!]</code> <code>[x]</code> <code>[-]</code>), never a <code>#todo</code> tag, with{" "}
            <code>@due()</code> and <code>@priority()</code> at the end of the line. Links to other
            files are <code>[[wiki links]]</code>, and callouts use the <code>&gt; [!tip]</code>{" "}
            form.
          </p>
          <p>
            When it edits a file it keeps task boxes, their <code>@started()</code> and{" "}
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
            with no upload step and no HermesMarkdown database holding your files.
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
            Without an AI key configured, no file content is ever sent anywhere. The companion only
            works when you send it a message — nothing runs on its own. Browser agents only get your
            files if you turn them on in Settings.
          </Callout>
        </>
      ),
    },
  ],
};
