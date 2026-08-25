import Link from "next/link";

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

const EDITORS = [
  {
    name: "HermesMarkdown",
    tagline: "Local-first, runs entirely in your browser",
    notes: "No accounts, no cloud uploads — reads and writes files straight to disk. Smart Workspaces, WikiLinks, and agent-readable context for AI tools.",
    href: "/editor",
    internal: true,
  },
  {
    name: "Obsidian",
    tagline: "Desktop knowledge base with plugins",
    notes: "Vault-based note-taking app with a large plugin ecosystem and graph view.",
    href: "https://obsidian.md/",
  },
  {
    name: "Typora",
    tagline: "Seamless live-preview editor",
    notes: "Blends editing and preview into a single view instead of a split pane.",
    href: "https://typora.io/",
  },
  {
    name: "iA Writer",
    tagline: "Minimalist focused-writing app",
    notes: "Distraction-free writing with strong typography, available on desktop and mobile.",
    href: "https://ia.net/writer",
  },
  {
    name: "Zettlr",
    tagline: "Academic and research-oriented",
    notes: "Built-in citation support and Zettelkasten-style linking for researchers.",
    href: "https://www.zettlr.com/",
  },
  {
    name: "Dillinger",
    tagline: "Browser-based, cloud-connected",
    notes: "Online editor with import/export to Dropbox, GitHub, and Google Drive.",
    href: "https://dillinger.io/",
  },
];

const FEATURES = [
  {
    title: "Live or side-by-side preview",
    body: "See the rendered output next to (or instead of) the raw Markdown as you type.",
  },
  {
    title: "Local-first file access",
    body: "Reads and writes files directly to your device's disk with no account or upload required.",
  },
  {
    title: "WikiLinks and backlinks",
    body: "[[Double-bracket]] links between notes so you can build a connected knowledge base.",
  },
  {
    title: "Syntax highlighting",
    body: "Headings, code fences, and emphasis are visually distinct from plain text as you write.",
  },
  {
    title: "Keyboard-first shortcuts",
    body: "Formatting, navigation, and file actions available without leaving the keyboard.",
  },
  {
    title: "Export options",
    body: "Turning a note into HTML, PDF, or a shareable file without a separate conversion tool.",
  },
];

export default function MarkdownEditorPage() {
  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans relative">
      <BackgroundGraphics />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-32 space-y-20">
        <section className="space-y-8 animate-hero-fade-in">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
          >
            ← Back to home
          </Link>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              What Is a{" "}
              <span className="text-neutral-600 dark:text-neutral-400 italic font-serif">Markdown Editor?</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-2xl font-medium">
            A Markdown editor is a tool that lets you write and format plain text using lightweight
            markup symbols — like <code className="text-[0.85em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">#</code>{" "}
            for headings or <code className="text-[0.85em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">**bold**</code>{" "}
            for emphasis — while showing a live or rendered preview of the result.
          </p>
        </section>

        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Popular Markdown Editors</h2>
          <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            Markdown editors range from lightweight browser tools to full desktop knowledge bases.
            Here&apos;s how some of the commonly recommended ones compare:
          </p>
          <div className="space-y-4">
            {EDITORS.map((editor) => (
              <div
                key={editor.name}
                className="p-6 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-2xl border border-black/5 dark:border-white/5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-bold text-lg">
                    {editor.internal ? (
                      <Link href={editor.href} className="hover:text-sage transition-colors">
                        {editor.name}
                      </Link>
                    ) : (
                      <a
                        href={editor.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-sage transition-colors"
                      >
                        {editor.name}
                      </a>
                    )}
                  </h3>
                  <span className="text-ui-footnote uppercase tracking-[0.15em] font-bold opacity-40">
                    {editor.tagline}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {editor.notes}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Key Features</h2>
          <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            Not every Markdown editor needs every feature, but these are the ones worth checking for
            before you commit to one:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="space-y-2">
                <div className="h-px w-8 bg-sage" />
                <h3 className="font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Where HermesMarkdown fits in</h2>
          <div className="space-y-5 text-neutral-500 dark:text-neutral-400 leading-relaxed text-base md:text-lg">
            <p>
              <strong className="text-ink-light dark:text-ink-dark font-semibold">HermesMarkdown</strong>{" "}
              is a local-first Markdown editor that runs entirely in your browser. It reads and writes
              files directly to your device&apos;s disk through the File System Access API, so there&apos;s
              no account, no cloud upload, and nothing leaves your machine.
            </p>
            <p>
              It supports Smart Workspaces for splitting panes, WikiLinks for connecting notes, and
              generates agent-readable context (an <code className="text-[0.85em] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono not-italic">AGENTS.md</code>{" "}
              index) so AI coding tools can navigate a vault without opening every file.
            </p>
          </div>
        </section>

        <section className="space-y-6 border-t border-black/5 dark:border-white/10 pt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">FAQ</h2>
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="font-bold text-lg">What is a Markdown editor?</h3>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                A Markdown editor is a tool that lets you write and format plain text using lightweight
                markup symbols while showing a live or rendered preview.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">What are the most popular Markdown editors?</h3>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Popular Markdown editors include HermesMarkdown, Obsidian, Typora, iA Writer, Zettlr, and
                Dillinger.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">What features should a Markdown editor have?</h3>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                A live or side-by-side preview, syntax highlighting, WikiLinks, keyboard shortcuts,
                offline/local file support, and export to formats like HTML or PDF.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Do Markdown editors require an account or cloud storage?</h3>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Not always. Local-first editors like HermesMarkdown read and write files directly to your
                device&apos;s disk, so no account or cloud upload is required.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-black/5 dark:border-white/10 pt-16 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/editor"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sage text-white font-semibold rounded-full hover:bg-sage/90 transition-colors text-sm"
            >
              Try HermesMarkdown
            </Link>
            <Link
              href="/documentation"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-black/10 dark:border-white/10 font-semibold rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-sm text-ink-light dark:text-ink-dark"
            >
              Read the documentation
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
