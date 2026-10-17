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
            With a key set, AI Chat, the Ask AI toolbar and the AI items in the slash menu appear; the
            palette lists <strong>Ask or Edit with AI…</strong> while the switch is on and runs its actions
            once a key is set. With the switch off, none of them show.
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
      id: "ai-commands",
      title: "AI commands",
      lead: "One place to talk to the AI — AI Chat — plus one-click rewrite actions, all once a key is configured.",
      keywords: "ask ai selection toolbar chat improve summarize tone attachments @file @vault",
      body: (
        <>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-0">AI Chat</h4>
          <p>
            Open it with <code>CTRL+SHIFT+B</code>, <strong>Freeform Prompt</strong> in the palette&apos;s AI menu, or the{" "}
            <strong>💬 Ask AI</strong> button in the toolbar that appears on a text selection.
            The chat sees the current note and your selection. Type <code>@</code> to reference
            another note by name, or use <code>@folder:path</code> / <code>@vault</code> to share an
            index (paths, titles, tags) of a folder or the whole vault. Attach images or files, ask
            follow-ups, and switch models per chat.
          </p>
          <p>
            Nothing changes your note until you choose: each reply can be edited, then used to
            replace the selection (or insert at the cursor) or replace the whole note.
          </p>
          <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">One-click actions</h4>
          <p>
            Common rewrites skip the conversation. Press <code>CTRL/CMD+J</code> (or choose{" "}
            <strong>Ask or Edit with AI…</strong> in the command palette) for one menu of four modes:{" "}
            <strong>Freeform Prompt</strong> opens AI Chat, and <strong>Improve Writing</strong>,{" "}
            <strong>Summarize / Structure</strong> and <strong>Insert Element</strong> each list their
            actions. Type to search every action at once (&ldquo;grammar&rdquo;, &ldquo;table&rdquo;). They work
            on the selection, or on the note where that makes sense. Each result opens in a diff review — red for removed, green for added —
            with Replace, Insert Below, or Cancel.
          </p>
          <KV
            rows={[
              { label: "Improve Writing", value: "Improve writing · Fix spelling and grammar · Shorten · Expand · Continue writing · Change tone (formal, casual, direct, polished)" },
              { label: "Summarize / Structure", value: "Summarize · Extract tasks · Create outline · Generate title · Explain selection" },
              { label: "Insert Element", value: "Generate table · Generate Mermaid diagram · Generate formula" },
            ]}
          />
        </>
      ),
    },
    {
      id: "ai-templates",
      title: "AI templates",
      lead: "Ask AI Chat for a template and it writes one you can save into templates/ with one click.",
      keywords: "ai template skill create rfc prompt save replace hermes skills create-template",
      body: (
        <>
          <p>
            Mention a template in AI Chat, for example &ldquo;make me an RFC template that asks for
            an owner&rdquo;, or start a message with <code>/template</code>. From then on, the chat
            knows the{" "}
            <TextLink href="#templates">template tokens</TextLink>. Each
            template in a reply shows a card with its path (for example <code>templates/rfc.md</code>) and any problems
            it spotted, like an unknown token.
          </p>
          <p>
            Nothing is saved until you click <strong>Save template</strong>. If a template with that
            name exists, the button reads <strong>Replace template</strong>. Saved templates show up
            in <code>/template</code> straight away. You need an open vault to save.
          </p>
          <Callout type="tip">
            To change how the chat writes templates, put your own instructions in{" "}
            <code>.hermes/skills/create-template.md</code> in your vault. When that file exists, its
            text (below any frontmatter) replaces the built-in instructions. The app never writes it.
          </Callout>
          <p>
            The template instructions are only added to chats that mention templates, as part of the
            same AI request. Nothing else is sent.
          </p>
        </>
      ),
    },
    {
      id: "ai-weekly-review-tasks",
      title: "Tasks in AI Chat",
      lead: "Ask AI Chat about your tasks, and it works from your own open tasks.",
      keywords: "ai tasks todo action items plan day next skill command",
      body: (
        <>
          <p>
            Mention <strong>tasks</strong>, to-dos or action items, or start with{" "}
            <code>/tasks</code>, and the chat sees your open tasks: in progress, to do and on hold,
            with their due dates, priorities and notes. Ask what to work on next, what&apos;s overdue,
            or paste meeting notes and ask for tasks. You get task lines with real{" "}
            <code>@due()</code> dates, worked out from today. The chat can&apos;t change your notes:
            apply its lines yourself.
          </p>
          <Callout type="tip">
            Private notes (<code>private: true</code> or a <code>private</code> tag) are never sent. Their tasks are left out and
            only counted. To change how the skill writes, put your own instructions in{" "}
            <code>.hermes/skills/tasks.md</code>. The app still adds the task list.
          </Callout>
        </>
      ),
    },
    {
      id: "ai-chat-tools",
      title: "AI Chat tools: search and tasks",
      lead: "With a vault open, AI Chat can look things up in your notes and tasks.",
      keywords: "ai tools search notes read note open tasks overdue due today agent",
      body: (
        <>
          <p>
            Ask about your own notes and the chat looks them up instead of guessing. It can{" "}
            <strong>search your notes</strong> (by text, name or tag), <strong>read a note</strong>, and{" "}
            <strong>list your open tasks</strong>: all of them, in progress, due today, overdue or
            upcoming, or by tag. Each lookup shows as a quiet line in the thread, like{" "}
            <em>Searched notes for &ldquo;pricing&rdquo; · 3 found</em>.
          </p>
          <p>
            The tools only read. To put what the chat writes into a note, use{" "}
            <strong>Insert at cursor</strong> or <strong>Copy</strong> under its reply.
          </p>
          <Callout type="tip">
            The tools run in your browser, against your vault. Only what they find for a question goes
            to the AI, in the same request. Private notes are never
            searched or read.
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
            Ask AI Chat for a table with totals, averages or counts, and
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
            Every AI action that rewrites text (improve, fix grammar, shorten, change tone, expand,
            continue, fix document) is told to keep formulas exactly as written. It never swaps a{" "}
            <code>=SUM(...)</code> for its current result.
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
            AI Chat, Continue writing and new notes from a prompt know HermesMarkdown&apos;s own
            syntax. Tasks get their status in the box (<code>[ ]</code> <code>[/]</code>{" "}
            <code>[!]</code> <code>[x]</code> <code>[-]</code>), never a <code>#todo</code> tag, with{" "}
            <code>@due()</code> and <code>@priority()</code> at the end of the line. Links to other
            notes are <code>[[wiki links]]</code>, and callouts use the <code>&gt; [!tip]</code>{" "}
            form.
          </p>
          <p>
            Every action that rewrites text keeps task boxes, their <code>@started()</code> and{" "}
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
              { label: "GitHub vault files", value: "Sent to GitHub only when you commit or pull" },
              { label: "AI requests", value: "Relayed to Anthropic / Google, not stored" },
              { label: "App settings (theme, font, editor layout)", value: "Browser localStorage / IndexedDB" },
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
};
