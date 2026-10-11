import { KV, type Subsection } from "../doc-primitives";

// Documentation content: Quick jot (Get Started, after the home feed).
export const quickJotItem: Subsection = {
  id: "quick-jot",
  title: "Quick jot",
  lead: "Add a line to today's sheet without leaving the note you're in.",
  keywords: "quick jot capture log append today daily sheet worklog shortcut",
  body: (
    <>
      <p>
        Press <code>CTRL+ALT+J</code> (<code>⌃⌥J</code> on a Mac), or run <strong>Quick jot</strong>{" "}
        from the command palette. A one-line field opens over what you&apos;re doing. Type the line
        and press Enter: it goes to the end of today&apos;s sheet on its own line, and the field
        closes. The note you were in, its cursor and its scroll position stay where they were.
        On a phone or tablet, run <strong>Quick jot</strong> from the command palette, or touch and
        hold the Today row in the home feed and choose <strong>Quick jot</strong>; tap{" "}
        <strong>Add</strong> to add the line.
      </p>
      <p>
        Plain text becomes a list item: <code>called the vendor</code> is added as{" "}
        <code>- called the vendor</code>. A line that already starts like a list or a task is
        kept as you typed it, so <code>- [ ] call back</code> adds an open task and{" "}
        <code>1. ship</code> stays numbered.
      </p>
      <p>
        Turn on <strong>Time on Quick Jots</strong> in Settings → Files to start each line with the
        time: <code>- 14:20 deploy done</code>, or <code>- [ ] 14:20 call back</code> for a task.
      </p>
      <KV
        rows={[
          { label: "Add the line", value: "ENTER (or the Add button)" },
          { label: "Cancel and clear the text", value: "ESCAPE" },
          { label: "Close and keep the text for next time", value: "Click or tap outside the field" },
        ]}
      />
      <p>
        If today&apos;s sheet doesn&apos;t exist yet, Quick jot creates it the same way{" "}
        <strong>Today&apos;s sheet</strong> does: in your Daily Sheets Folder (you&apos;re asked
        for it the first time) and from your Journal or Daily template if you have one. It
        doesn&apos;t open the sheet. A small message says <em>Added to 2026-10-10</em>; click{" "}
        <strong>Open</strong> in it to go to the sheet.
      </p>
      <p>
        If the sheet is open in a tab, the line shows up there right away, and the cursor in that
        tab stays put. Any unsaved changes in that tab are saved together with the line. If the
        file was changed somewhere else in the meantime, the saved file wins and your unsaved text
        is kept as a snapshot you can recover.
      </p>
      <p>
        Quick jot needs an open vault, because today&apos;s sheet lives in it. With no vault open,
        the command is turned off.
      </p>
    </>
  ),
};
