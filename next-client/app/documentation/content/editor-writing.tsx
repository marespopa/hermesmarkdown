import { Callout, Code, KV, type Subsection } from "../doc-primitives";

// Documentation content: Editor group, writing features (writing through slash menu).
export const editorWritingItems: Subsection[] = [
  {
    id: "writing",
    title: "Writing",
    lead: "Write Markdown with inline highlighting and click actions.",
    keywords: "find replace search regex heading shortcut link code block rendering source inline wysiwyg full width wide column reading width word wrap line numbers invisibles whitespace empty lines pills dates priority shortcode images paste calc",
    body: (
      <>
        <p>
          You always edit the Markdown source, styled as you type: headings, emphasis, links,
          tags and dates are highlighted in place, and tables render as an editable grid.
          Word wrap, line numbers, Show Invisibles (¶ on empty lines, dots for spaces), font and theme live under Settings.
        </p>
        <p>
          The text sits in a column about as wide as a page, so lines stay easy to read on a wide
          screen. Changing the text size never moves the column&apos;s edges; it only changes how
          much fits on a line. To use the whole editor instead, turn on{" "}
          <strong>Full Width</strong> under Settings → Editor, or run{" "}
          <strong>Enable full width</strong> from the command palette.
        </p>
        <p>
          Dates (<code>2026-09-27</code>, <code>27/09/2026</code>, <code>[[2026-09-27]]</code>,{" "}
          <code>@due(…)</code>) and <code>@priority</code> annotations show as pills around
          their text. CTRL+Click a date to open the date picker.
        </p>
        <p>
          Press <strong>CTRL/CMD+F</strong> to find and replace in the note, with match case,
          whole word and regex options. CTRL/CMD+ALT+1…6 turns the line into a heading (press
          it again to remove it), CTRL/CMD+SHIFT+L wraps the selection as a link and
          CTRL/CMD+ALT+C wraps it in a code block, or removes the block around the caret.
        </p>
        <p>
          Paste or drop an image and it&apos;s saved to the vault&apos;s <code>assets/</code>{" "}
          folder and linked with <code>![](assets/…)</code>. Paste comma- or tab-separated
          data outside a table and HermesMarkdown offers to convert it into a Markdown table.
        </p>
        <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">Shortcodes</h4>
        <p>Type a shortcode and it expands in place.</p>
        <KV
          rows={[
            { label: "{date} · ..d · {time} · {datetime}", value: "Current date / time" },
            { label: "..tomorrow · ..yesterday", value: "Relative dates" },
            { label: "{iso} · {unix} · {day} · {week} · ..log", value: "Timestamps & log prefix" },
            { label: "{todo} · {done} · {table}", value: "Task line / starter table" },
            { label: "{check} {error} {idea} {warn} {fix} {bug} {star}", value: "Emoji" },
            { label: "calc(2*21)=", value: "Inline calculation" },
          ]}
        />
        <p>
          For running totals that keep their working, use the{" "}
          <a href="#inline-calculator" className="text-sage font-semibold hover:underline">inline calculator</a> instead.
        </p>
        <Callout type="tip">
          Click actions work without touching raw syntax — checkboxes toggle, lifecycle tags cycle on
          click, and wikilinks open with CTRL+Click.
        </Callout>
      </>
    ),
  },
  {
    id: "vim-mode",
    title: "Vim mode",
    lead: "Use familiar Vim motions and editing modes in the source editor.",
    keywords: "vim vi keybindings normal insert escape settings setup",
    body: (
      <>
        <p>
          Turn on Vim mode during the welcome setup, or enable it later under Settings → Appearance
          (or the <strong>Enable Vim mode</strong> command). Outside Insert mode, a small pill at the
          bottom right of the note shows the current mode and any keys of a command you haven&apos;t
          finished. Typing <code>:</code> or <code>/</code> opens the command line in that pill.
        </p>
        <Callout type="tip">
          Press <code>Escape</code> to leave Insert mode and return to Normal mode.
        </Callout>
      </>
    ),
  },
  {
    id: "flow-mode",
    title: "Flow mode",
    lead: "Fade everything but the paragraph you're writing and keep the current line centered.",
    keywords: "flow focus typewriter scrolling dim fade paragraph distraction free writing settings setup",
    body: (
      <>
        <p>
          Turn on flow mode during the welcome setup, or enable it later under Settings → Appearance
          (or the <strong>Enable flow mode</strong> command). It&apos;s off by default.
        </p>
        <KV
          rows={[
            { label: "Paragraph focus", value: "Other paragraphs fade while you write" },
            { label: "Typewriter scrolling", value: "The caret line stays centered" },
          ]}
        />
        <p>
          The current paragraph is the run of non-blank lines around the caret. Everything else
          dims while the editor has focus and returns to full strength when you click away.
          Typing, deleting, undo/redo and moving with the keyboard keep the line centered; clicking
          or selecting with the mouse never scrolls the view.
        </p>
        <Callout type="note">
          Flow mode only changes how the note looks. The Markdown in your file stays the same.
        </Callout>
      </>
    ),
  },
  {
    id: "markdown-marks",
    title: "Markdown marks",
    lead: "Notes read like a page: Markdown marks appear only where you're editing.",
    keywords: "markdown syntax hidden marks bold italic strikethrough heading quote bullet list task checkbox numbered callout code block fence language tag date chip live preview",
    body: (
      <>
        <p>
          Bold, italic, strikethrough and inline-code marks are hidden until the caret touches the
          text they wrap. A heading&apos;s <code>#</code> and a quote&apos;s <code>&gt;</code> show
          faintly in the margin while the caret is on their line, so the words never move. Lists
          look the same whether you&apos;re editing them or not, and a long item wraps under its
          own text. Tags and dates keep their chip while you edit the text inside it.
        </p>
        <KV
          rows={[
            { label: "**bold**, *italic*, ~~strike~~, `code`", value: "Marks show while the caret is inside" },
            { label: "# Heading, > Quote", value: "Marks show in the margin while the caret is on the line" },
            { label: "- List item", value: "Always shown as • (◦ when nested)" },
            { label: "- [ ] Task", value: "Always shown as a checkbox; click it to tick the task" },
            { label: "1. Numbered item", value: "The number sits in a muted column" },
            { label: "> [!note] Title", value: "Shown as a rounded card with the type's icon and label; press Home on the line to edit the type" },
            { label: "> [!note]- Title", value: "Starts collapsed when the note opens (+ starts expanded); the chevron folds any callout" },
            { label: "```js … ```", value: "Fences fade out away from the caret; the language shows in the corner" },
            { label: "#tag, 2026-10-08", value: "Stay chips while you edit them" },
            { label: "Other editor", value: "A split pane you're not typing in shows no marks" },
          ]}
        />
      </>
    ),
  },
  {
    id: "tables",
    title: "Tables",
    lead: "Tables always render as a clean grid you edit like a spreadsheet: click a cell and type. The pipe syntax stays out of sight.",
    keywords: "table csv json sort alignment formula sum spreadsheet paste",
    body: (
      <>
        <p>
          Type <code>/table</code> in the slash menu, or the <code>{"{table}"}</code> shortcode. Both
          drop a 3×2 starter table and put you in its first cell.
        </p>
        <p>
          Click any cell to edit it in place. Tab moves to the next cell, and tabbing out of the last
          one adds a row. Enter moves down a column. The arrow keys cross cell edges and step out of
          the table at its borders. The file is updated as you type, so undo, autosave and split
          panes always match what you see. The file on disk is still a plain Markdown pipe table.
        </p>
        <p>
          A focused cell shows its raw Markdown, such as <code>**bold**</code> or links. Every other
          cell shows the rendered result. <code>Ctrl/Cmd+B</code>, <code>I</code> and{" "}
          <code>E</code> wrap the selection in bold, italic or code, and <code>Ctrl/Cmd</code>-click
          opens a link. A pipe you type is stored escaped, so it can&apos;t split the cell.
        </p>
        <p>
          While you edit a table, column letters (A, B, C…) and row numbers (1, 2, 3…) appear
          around it, like in a spreadsheet, with the current cell&apos;s row and column
          highlighted. Click a letter or number for that column&apos;s or row&apos;s menu, or
          right-click any cell (long-press on touch). Nothing is drawn on top of the cells.
        </p>
        <KV
          rows={[
            { label: "Row", value: "Insert above / below, move up / down, delete" },
            { label: "Column", value: "Insert left / right, move, sum, sort, align, delete" },
            { label: "Table", value: "Edit as Markdown, copy as CSV or JSON, delete (confirm with a second click)" },
          ]}
        />
        <p>
          Paste a range copied from a spreadsheet (or multi-line CSV) into a cell. It fills the
          cells from there, adding rows and columns as needed. Smart sorting recognizes dates,
          currency and plain numbers. Each structural change is a single undo step.
        </p>
        <p>
          If a table looks wrong (say, a line you typed just below it turned into a row), choose
          <strong> Edit as Markdown</strong> from the menu or press <code>Ctrl/Cmd</code>+
          <code>Shift</code>+<code>Enter</code> in a cell. The table shows as plain pipe text so
          you can fix it by hand, and turns back into a grid when you move the caret out of it.
        </p>
        <h4 className="text-lg font-bold tracking-tight !mb-2 !mt-6">Formulas</h4>
        <p>
          Start a cell with <code>=</code> to compute it, like a spreadsheet. The cell shows the
          result, and clicking it shows the formula for editing. Columns are lettered{" "}
          <code>A</code>, <code>B</code>, <code>C</code>… and the header is row 1, so the first data
          row is row 2, matching the letters and numbers shown around the table while you edit.{" "}
          <strong>Sum column</strong> in the table menu adds a totals row for you. Rows you add at
          the end (Tab or Enter) go above the totals row, and its ranges grow to include them.
        </p>
        <KV
          rows={[
            { label: "Cell & range", value: "=B2 · =SUM(B2:B5) · =AVERAGE(B2:D2)" },
            { label: "Functions", value: "SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, ROUND, ABS, IF, AND, OR, NOT, CONCAT" },
            { label: "Another table", value: "=SUM(Income!B) — named by the heading above it" },
            { label: "Another note", value: "=[[Budget]]!B5 · =[[Budget#Income]]!B5" },
          ]}
        />
        <p>
          Amounts like <code>$2,000</code> or <code>1000 RON</code> count as numbers, and totals keep
          their currency. Errors show spreadsheet-style (<code>#REF!</code>, <code>#DIV/0!</code>,{" "}
          <code>#CIRCULAR!</code>, <code>#NAME?</code> for an unknown function,{" "}
          <code>#VALUE!</code> for text where a number is needed). Rows containing a formula are treated as summary rows and are
          never moved by sorting.
        </p>
        <Callout type="note">
          Formulas are stored as plain text in the Markdown file (<code>| =SUM(B2:B5) |</code>),
          so other Markdown apps show the formula, not the result. References to other notes read
          those notes when you open this one and refresh when you return to its pane.
        </Callout>
        <p>
          AI features know this syntax too. See{" "}
          <a href="#ai-table-formulas" className="text-sage font-semibold hover:underline">AI &amp; table formulas</a>.
        </p>
      </>
    ),
  },
  {
    id: "inline-calculator",
    title: "Inline calculator",
    lead: "Type math into any note and see the answer at the end of the line, with named values you can reuse further down.",
    keywords: "calculator math calc sum total budget estimate variables named values percent of arithmetic numbers",
    body: (
      <>
        <p>
          Write an expression on its own line and its result appears in faint text at the end of
          that line. Give a value a name with <code>name = …</code> and use it on any later line of
          the same note. Names can be several words and ignore case, so <code>Monthly rent</code>{" "}
          and <code>monthly rent</code> are the same value. In this example you type the left side;
          the editor adds the <code>= …</code> results:
        </p>
        <Code>{`rent = 1200
utilities = 180
rent + utilities          = 1380
rent + utilities + 15%    = 1587`}</Code>
        <KV
          rows={[
            { label: "+ − * / ( )", value: "Arithmetic" },
            { label: "450 + 15%", value: "= 517.5 · percent of the left side" },
            { label: "15% of 200", value: "= 30" },
            { label: "1,200 * 3", value: "= 3600 · thousands separators" },
            { label: "rent = rent + 100", value: "Redefines a value from its old one" },
          ]}
        />
        <p>
          Only lines that are math get a result. Prose, headings, plain numbers (<code>1200</code>),
          simple definitions (<code>rent = 1200</code>), dates and phone numbers are left alone, and
          so is everything in frontmatter, code blocks and <code>$$</code> math blocks. List items
          work: <code>- rent + utilities</code> still shows its total. Comparisons such as{" "}
          <code>a == b</code> or <code>a &gt;= b</code> never define a value.
        </p>
        <p>
          Results are rounded to four decimals and have no thousands
          separator. If a line can&apos;t be worked out, for example because it uses a name that
          isn&apos;t defined above it, it simply shows no result.
        </p>
        <Callout type="note">
          Results are only displayed. Your file holds exactly what you typed, so the note stays plain
          Markdown. To write a result into the note instead, use the <code>calc(2*21)=</code>{" "}
          shortcode.
        </Callout>
      </>
    ),
  },
  {
    id: "code-diagrams",
    title: "Code, diagrams & math",
    lead: "Fenced code blocks get real syntax highlighting, and Mermaid diagrams and LaTeX math render right in the note.",
    keywords: "code block syntax highlighting language mermaid diagram latex math katex formula equation",
    body: (
      <>
        <p>
          Any fenced code block (<code>/code</code> in the slash menu, or typing ```` ```lang ````
          yourself) is syntax-highlighted as you type, for any language CodeMirror recognizes from
          the fence's language tag. Inserting one from the slash menu offers a language picker.
        </p>
        <p>
          Insert a diagram with <code>/mermaid</code> or type a <code>```mermaid</code> fence. Once
          the fence is closed, the editor shows the rendered diagram in its place. Double-click it
          (or use its <strong>Edit</strong> button, or press <code>CTRL/CMD+SHIFT+ENTER</code> with
          the cursor next to it) to edit the source with a live preview. From there,{" "}
          <strong>Open viewer</strong> lets you zoom, fit-to-width, and download the SVG. Syntax
          errors show in place of the diagram.
        </p>
        <p>
          Display math works the same way: put LaTeX between <code>$$</code> lines (or on one line,
          as <code>$$ E = mc^2 $$</code>), or in a <code>```math</code> fence, and it renders with
          KaTeX.
        </p>
        <Code>{`\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do it]
  B -->|No| D[Skip it]
\`\`\``}</Code>
        <Callout type="note">
          Both round-trip as plain Markdown — a highlighted code block is still a fenced code block
          on disk, a diagram is still a ```mermaid fence, and math is still <code>$$</code>. Nothing HermesMarkdown-specific gets
          written to the file.
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
          Type <code>/link</code> in the slash menu to open the Add Link dialog — fill in the link
          text and the URL, then Insert.
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
        <p>
          While you edit a link&apos;s text, its URL stays folded into a small <code>↗</code>, so
          the paragraph doesn&apos;t rewrap around it. Click the <code>↗</code>, or move the caret
          inside the parentheses, to edit the URL itself.
        </p>
      </>
    ),
  },
  {
    id: "wikilinks",
    title: "Wikilinks",
    lead: "Link notes to each other with [[Note name]] — type [[ and pick a note.",
    keywords: "wikilink wiki link backlink note [[ connect",
    body: (
      <>
        <p>
          Type <code>[[</code> (or <code>/wikilink</code> in the slash menu) to open the WikiLink
          dialog, then search your vault and pick a note — or switch to creating a new note, which
          is created and linked in one step. The link is written as plain{" "}
          <code>[[Note name]]</code> text, compatible with other Markdown apps that support
          wikilinks.
        </p>
        <p>
          <code>CTRL+Click</code> a wikilink to open the note. A link to
          a note that doesn&apos;t exist yet creates it, after you confirm or pick a template; see{" "}
          <a href="#templates" className="text-sage font-semibold hover:underline">Templates</a>.
        </p>
      </>
    ),
  },
  {
    id: "slash-menu",
    title: "Slash menu",
    lead: "Type / at the start of a line or after a space for a searchable menu of insertable content, plus AI actions when AI is configured.",
    keywords: "slash menu insert template",
    body: (
      <>
        <p>
          Keep typing after <code>/</code> to fuzzy-filter by name; <code>↑</code>/<code>↓</code>{" "}
          to move the selection, <code>Enter</code> to insert, <code>Escape</code> to dismiss.
        </p>
        <KV
          rows={[
            { label: "Link · WikiLink", value: "Open the link dialogs" },
            { label: "Date", value: "Pick a date from a calendar" },
            { label: "Task", value: "Checklist task with status, due date & tags" },
            { label: "Table", value: "Starter table" },
            { label: "Code · Mermaid", value: "Fenced code / diagram block" },
            { label: "Callout · Collapse", value: "Callout / collapsed callout" },
            { label: "Frontmatter", value: "Insert or reveal the YAML block" },
            { label: "Template (/template, /tpl)", value: "Insert a template from your vault" },
            { label: "AI Chat & AI actions", value: "Only when AI is configured" },
          ]}
        />
      </>
    ),
  },
];
