import { Callout, Code, KV, type Subsection } from "../doc-primitives";
import TextLink from "@/app/components/TextLink";

// Documentation content: Editor group, writing features (writing through slash menu).
export const editorWritingItems: Subsection[] = [
  {
    id: "writing",
    title: "Writing",
    lead: "Write Markdown with inline highlighting and click actions.",
    keywords: "find replace search regex heading shortcut link code block rendering source inline wysiwyg full width wide column reading width word wrap line numbers invisibles whitespace empty lines pills dates priority shortcode images paste calc html rich text google docs word convert markdown",
    body: (
      <>
        <p>
          You always edit the Markdown source, styled as you type: headings, emphasis, links,
          tags and dates are highlighted in place, and tables render as an editable grid.
          Font and theme live under Settings; word wrap, line numbers and invisibles (¶ on empty
          lines, dots for spaces) are command palette toggles (<strong>Toggle Word Wrap</strong>,{" "}
          <strong>Toggle Line Numbers</strong>, <strong>Toggle Invisibles</strong>).
        </p>
        <p>
          The text fills the whole editor by default. For a column about as wide as a page, so
          lines stay easy to read on a wide screen, turn off <strong>Full Width</strong> under
          Settings → Appearance → Typography, or run <strong>Toggle Full Width</strong> from the
          command palette. Changing the text size never moves the column&apos;s edges; it only
          changes how much fits on a line.
        </p>
        <p>
          Dates (<code>2026-09-27</code>, <code>27/09/2026</code>, <code>[[2026-09-27]]</code>,{" "}
          <code>@due(…)</code>, a task's <code>@started(…)</code> and <code>@done(…)</code>) and{" "}
          <code>@priority</code> annotations show as pills around
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
        <p>
          Paste rich text from a web page, Google Docs, Word or an email and it arrives as Markdown:
          headings, lists, links, tables, bold and italics, converted the same way as the Markdown
          Cleaner in Free Tools. A toast offers <strong>Paste as plain text</strong> if you wanted the
          bare text instead, and <code>CTRL/CMD+SHIFT+V</code> always pastes plain text. Pastes into
          code blocks, bare URLs and copies with no formatting paste as usual.
        </p>
        <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Shortcodes</h4>
        <p>
          Type a shortcode and it expands in place. Type <code>{"{"}</code> for a menu of the
          emoji shortcodes, and keep typing a name to narrow it (or <code>/emoji</code> in the slash menu).
        </p>
        <KV
          rows={[
            { label: "{date} · ..d · {time} · {datetime}", value: "Current date / time" },
            { label: "..tomorrow · ..yesterday", value: "Relative dates" },
            { label: "{iso} · {unix} · {day} · {week} · ..log", value: "Timestamps & log prefix" },
            { label: "{todo} · {done} · {table}", value: "Task line / starter table" },
            { label: "{check} {error} {idea} {warn} {fix} {bug} {star} {note} {question} {info} {pin} {link} {fire} {rocket} {party} {target} {lock} {key}", value: "Emoji" },
            { label: "calc(2*21)=", value: "Inline calculation" },
          ]}
        />
        <p>
          For running totals that keep their working, use the{" "}
          <TextLink href="#inline-calculator">inline calculator</TextLink> instead.
        </p>
        <Callout type="tip">
          Click actions work without touching raw syntax — CTRL+Click on a task&apos;s box moves it on a status,
          lifecycle tags cycle on click, and wikilinks open with CTRL+Click.
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
          Turn on Vim mode under Settings → Editor
          (or the <strong>Toggle Vim Mode</strong> command). Outside Insert mode, a small pill at the
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
    id: "focus",
    title: "Focus",
    lead: "Dim everything but the paragraph or sentence you're writing.",
    keywords: "focus word count words hide interface chrome toolbar tabs sidebar collapse distraction free minimal typewriter scrolling dim paragraph sentence flow writing settings setup",
    body: (
      <>
        <p>
          Choose a level under Settings → Editor → Focus, or run one of the{" "}
          <strong>Focus: …</strong> commands from the command palette.{" "}
          <code>CTRL/CMD+ALT+F</code> (<strong>Toggle Sentence Focus</strong>) switches sentence
          focus on, and back to the level you had before. As the caret moves from one sentence to
          the next, the old one fades out and the new one fades in.
        </p>
        <KV
          rows={[
            { label: "Off", value: "Every line at full strength (default)" },
            { label: "Dim other paragraphs", value: "Other paragraphs fade and the caret line stays centered" },
            { label: "Dim other sentences", value: "Only the sentence you're writing stays at full strength" },
          ]}
        />
        <p>
          Nothing hides while you type, and there&apos;s no toolbar to hide: only the button at the top
          of the page, which opens the command palette. To be alone with the text, close the sidebar (
          <code>CTRL/CMD+\</code>); the page takes its room, and it stays that way across reloads. The
          sidebar stays open until you close it; turn on{" "}
          <strong>Close Sidebar While Writing</strong> (Settings → Editor) to have it put away as soon
          as you type in a note.
        </p>
        <p>
          At the strongest level, the current paragraph is the run of non-blank lines around the
          caret. Everything else dims while the editor has focus and returns to full strength when
          you click away. Typing, deleting, undo/redo and moving with the keyboard keep the line
          centered; clicking or selecting with the mouse never scrolls the view.
        </p>
        <p>
          Turn on <strong>Word Count</strong> in Settings → Editor (or run{" "}
          <strong>Toggle Word Count</strong>) to show the note&apos;s word count faintly in the
          bottom-left corner of the editor. It steps aside while you type and comes back when you
          pause or move the mouse. Frontmatter and Markdown marks on their own, like{" "}
          <code>#</code> or <code>-</code>, aren&apos;t counted.
        </p>
        <Callout type="note">
          Focus only changes how the editor looks. The Markdown in your file stays the same.
        </Callout>
      </>
    ),
  },
  {
    id: "markdown-marks",
    title: "Markdown marks",
    lead: "Plain typing: every Markdown character stays on screen, dimmed, exactly as it is in the file.",
    keywords: "markdown syntax hidden marks bold italic strikethrough heading quote bullet list task checkbox numbered callout code block fence language tag date chip live preview",
    body: (
      <>
        <p>
          Markdown shows where you&apos;re writing: on the line with the caret (or every line a
          selection covers), each mark appears as you typed it, dimmed; everywhere else the marks
          step aside and you read the formatted text. Bold, italic, strikethrough and inline-code
          marks open up in the text. A heading&apos;s <code>#</code> and a quote&apos;s or
          callout&apos;s <code>&gt;</code> hang faintly in the margin, so those lines don&apos;t move. Lists look just like their Markdown: the
          marker before the text, nested items indented by their own spaces, drawn as wide as a letter (Tab adds four), so
          copying a list gives you what you see. A task&apos;s marker takes its status colour. Typing <code>-</code> at the start of a line adds the space after it, so
          you can go straight to the item; keep typing dashes for a <code>---</code> rule. Tags and
          dates keep their chip while you edit the text inside it.
        </p>
        <KV
          rows={[
            { label: "**bold**, *italic*, ~~strike~~, `code`", value: "Marks show on the caret's line, dimmed; hidden elsewhere" },
            { label: "# Heading, > Quote", value: "Marks show on the caret's line, faint, in the margin; hidden elsewhere" },
            { label: "- List item", value: "Stays as typed: a faint marker before the text, nested items indented by their spaces" },
            { label: "- [ ] Task, 1. [ ] Task", value: "Stays as typed, the marker coloured by its status as on the Tasks page, so you can write the status ([/], [!], [x]); CTRL+Click it to go To Do → In Progress → Done" },
            { label: "1. Numbered item", value: "Stays as typed, the number faint" },
            { label: "> [!note] Title", value: "Shown as a rounded, tinted card; the > and [!note] show on the caret's line, so edit the type in place" },
            { label: "> ## Heading, > - item, > | table |", value: "Inside a callout, headings, lists, tasks, tables, code and quotes look as they do outside it; Enter on a list item adds the next one" },
            { label: "> [!note]- Title", value: "Starts collapsed when the note opens (+ starts expanded); folding with the chevron writes the sign for you" },
            { label: "```js … ```", value: "Fences stay as typed, language included" },
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
        <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Formulas</h4>
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
          their currency. So does a share of an amount (<code>=B2*10%</code>), while a ratio of two
          amounts (<code>=C2/B2*100</code>) and a count are plain numbers. Errors show spreadsheet-style (<code>#REF!</code>, <code>#DIV/0!</code>,{" "}
          <code>#CIRCULAR!</code>, <code>#NAME?</code> for an unknown function,{" "}
          <code>#VALUE!</code> for text where a number is needed). Rows containing a formula are treated as summary rows and are
          never moved by sorting.
        </p>
        <p>
          A table takes its name from the heading right above it, with only blank lines between
          them. Text between the heading and the table leaves the table without a name, and
          formulas that refer to it show <code>#REF!</code>. Put a description below the table
          instead.
        </p>
        <Callout type="note">
          Formulas are stored as plain text in the Markdown file (<code>| =SUM(B2:B5) |</code>),
          so other Markdown apps show the formula, not the result. References to other notes read
          those notes when you open this one and refresh when you return to its pane.
        </Callout>
        <p>
          AI features know this syntax too. See{" "}
          <TextLink href="#ai-table-formulas">AI &amp; table formulas</TextLink>.
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
          shortcode, which works in table cells too.
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
    id: "boards",
    title: "Boards",
    lead: "Sketch on an infinite canvas: freehand, shapes, arrows and text, saved inside a Markdown note.",
    keywords: "board canvas drawing sketch whiteboard draw diagram shapes arrows",
    body: (
      <>
        <p>
          Open the command palette and run <strong>New board</strong> (with a vault open). It asks
          for the board&apos;s name, creates <code>Sprint plan.board.md</code> (for a board named
          Sprint plan) in your New Notes folder and opens it as a canvas.
          If the name is taken you get <code>Sprint plan (1).board.md</code>.
          To link a new board from the note you&apos;re writing, type <code>/board</code>: it asks for
          the name, creates the board without leaving the note and inserts a link to it (a board
          that already has that name is linked as it is).
          You can also start one from an empty note: click the <strong>Board</strong> pill under the
          first line (from a fresh, unsaved note it asks for a name and creates a new board file), or pick{" "}
          <strong>Board</strong> when a missing link asks how to create its note.
        </p>
        <p>
          A board is still a Markdown note. The drawing is stored in a fenced block, so you can write
          a caption above it, add <code>[[links]]</code> and tags, and it syncs like any other note.
          Drawing changes are saved automatically, like text.
        </p>
        <KV
          rows={[
            { label: "Edit as Markdown", value: "Right-click the board's title (or use the palette's Edit Board as Markdown) to see the raw file" },
            { label: "Open as Board", value: "Switch back from the raw file to the canvas" },
          ]}
        />
        <Callout type="note">
          Images aren&apos;t supported on boards yet. Undo history belongs to the canvas and starts
          fresh when the file changes on disk. If a sync leaves merge conflicts in a board, or its
          data can&apos;t be read, the pane says so and offers <strong>Edit as Markdown</strong> so you
          can repair it. Boards work offline and make no network requests.
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
          <TextLink href="#templates">Templates</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: "embeds",
    title: "Embedding notes and files",
    lead: "Show another note, a CSV table, an image or a code file inside this one: ![[Note name]] or /path on a line of its own.",
    keywords: "embed embed file command transclude transclusion include note section heading ![[ csv table image picture code file slash compile book chapters",
    body: (
      <>
        <p>
          Put <code>![[Note name]]</code> on a line of its own and the note&apos;s text shows
          right under it, read-only. The line stays as you typed it. Add a heading to show only
          that section: <code>![[Roadmap#Q3 goals]]</code> shows the Q3 goals heading and
          everything under it, up to the next heading of the same level.
        </p>
        <p>
          A line holding only a slash and a file name works too, and not only for notes:
        </p>
        <KV
          rows={[
            { label: "/Chapter 1.md", value: "The note's text" },
            { label: "/data/sales.csv", value: "A table; the first row is the header" },
            { label: "/assets/chart.png", value: "The image (png, jpg, gif, webp, svg, avif)" },
            { label: "/scripts/auth.ts", value: "The code with syntax colours (most languages, plus txt and log); long files show their first 400 lines" },
          ]}
        />
        <p>
          A file path is looked up next to the note first, then from the vault root. Start a line
          with <code>/</code> and type the start of a note&apos;s name: the rest of the best match
          appears in faded text, and <code>Tab</code> (or <code>→</code>) accepts it. The slash
          menu also lists matching notes; picking one writes its path for you. Or type{" "}
          <code>/embed</code> anywhere and pick <strong>Embed file</strong>: it puts a{" "}
          <code>/</code> on a line of its own (splitting the line if you were mid-sentence) and
          opens the menu there, so you can choose a note or type a file&apos;s path.
        </p>
        <p>
          Embeds stay current: a note open in a pane shows its unsaved edits, and other files are
          checked again whenever you come back to the window, so a CSV you just changed in a
          spreadsheet app shows its new rows. Click a note&apos;s name above its embed to open it.
          Private notes stay hidden until you show them, and a board shows its caption.
        </p>
        <p>
          To build one document from many, such as a book whose main note holds only{" "}
          <code>/01-introduction.md</code>, <code>/02-analysis.md</code> and so on, use{" "}
          <strong>Export as PDF</strong> or <strong>Export as Compiled Markdown</strong>: every
          embed is filled in, embeds inside embedded notes too, CSV files become tables, code
          files code blocks, and images keep working. A note that would end up inside itself is
          left as its line, so nothing loops.
        </p>
      </>
    ),
  },
  {
    id: "slash-menu",
    title: "Slash menu",
    lead: "Type / at the start of a line or after a space for a searchable menu of insertable content, plus AI actions when AI is configured.",
    keywords: "slash menu insert template heading list todo quote divider turn into block emoji alias",
    body: (
      <>
        <p>
          The menu opens grouped by kind. Keep typing after <code>/</code> to search: a command is
          found by its name, any word of it, a short alias (<code>/h1</code>, <code>/todo</code>,{" "}
          <code>/ul</code>, <code>/hr</code>, <code>/yaml</code>, <code>/url</code>) or a word of its
          description, best match first. <code>↑</code>/<code>↓</code> to move the selection,{" "}
          <code>Enter</code> to insert, <code>Escape</code> to dismiss.
        </p>
        <p>
          The basic blocks turn the current line into that block and keep its text: type{" "}
          <code>/h2</code> on an empty line for a new heading, or at the end of a line to turn it
          into one.
        </p>
        <KV
          rows={[
            { label: "Text · Heading 1–3", value: "Plain text or a heading" },
            { label: "Bulleted · Numbered · To-do list", value: "A list item or checkbox" },
            { label: "Quote · Divider", value: "A quotation, or a line between sections" },
            { label: "Emoji", value: "Pick from the emoji shortcodes" },
            { label: "Link · WikiLink", value: "Open the link dialogs" },
            { label: "Date", value: "Pick a date from a calendar" },
            { label: "Task", value: "Checklist task with status, due date & tags" },
            { label: "Table", value: "Starter table" },
            { label: "Code · Mermaid", value: "Fenced code / diagram block" },
            { label: "Board", value: "Name a new drawing board and link it at the caret (with a vault open)" },
            { label: "A note's name", value: "At the start of a line, matching notes are offered to embed as /path.md" },
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
