import { Callout, KV, type Subsection } from "../doc-primitives";

// Documentation content: Daily, weekly, monthly (Get Started, after Quick jot).
export const rollupsItem: Subsection = {
  id: "daily-weekly-monthly",
  title: "Daily, weekly, monthly",
  lead: "Write each day. Each week's sheet and month's sheet is built from your days, ready to read, edit or share.",
  keywords:
    "weekly monthly rollup week month review status report summary worklog daily sheet refresh blocked",
  body: (
    <>
      <p>Your worklog has three levels. Each one is a plain note in your vault.</p>
      <KV
        rows={[
          { label: "Daily sheet", value: "2026-10-09.md, one per day" },
          { label: "Weekly sheet", value: "2026-W41.md, an ISO week from Monday to Sunday" },
          { label: "Monthly sheet", value: "2026-10.md, a calendar month" },
        ]}
      />
      <p>
        A week belongs to the year that holds its Thursday, so the week from Dec 28, 2026 to Jan 3,
        2027 is <code>2026-W53</code>. Weekly and monthly sheets go in your Daily Sheets Folder
        (Settings → Files). If that folder has <code>{"{{month}}"}</code> in it, a week that spans
        two months goes in the month that holds its Thursday, and a monthly sheet goes in its own
        month.
      </p>
      <KV
        rows={[
          { label: "This week's sheet / Last week's sheet", value: "Open the week's sheet, or create it" },
          { label: "This month's sheet / Last month's sheet", value: "Open the month's sheet, or create it" },
          { label: "Refresh rollup", value: "Rebuild the generated part of the open weekly or monthly sheet" },
        ]}
      />
      <p>
        Run them from the command palette. <strong>Last week&apos;s sheet</strong> on a Monday
        morning and <strong>Last month&apos;s sheet</strong> on the 1st are for the period that just
        ended. If the sheet already exists, it opens as it is. If it doesn&apos;t, it is built from
        your daily sheets and opened with the cursor under <strong>Notes</strong>. The commands need
        an open vault.
      </p>
      <p>A weekly sheet holds:</p>
      <ul>
        <li>
          A summary line, like <code>12 done · 4 open · 1 blocked</code>, or{" "}
          <code>No daily sheets this week</code>.
        </li>
        <li>
          <strong>Done</strong>: checked tasks, grouped by their first tag (<code>#bug</code>,{" "}
          <code>#meeting</code>, …), with untagged ones last under Other.
        </li>
        <li>
          <strong>Blocked</strong>: open tasks tagged <code>#blocked</code> or <code>#hold</code>.
        </li>
        <li>
          <strong>Still open</strong>: the other unchecked tasks, marked <em>in progress</em> when
          they are, with their due date when they have one.
        </li>
        <li>
          <strong>Notes</strong>: an empty section for you, for highlights, decisions and what&apos;s
          next. It is never generated.
        </li>
      </ul>
      <p>
        Only task lines from the period&apos;s daily sheets are used, found by file name anywhere in
        your vault. Days without a sheet are skipped. Each item links back to the day it came from,
        like <code>[[2026-10-06]]</code>, and each section runs oldest first. A task you copied
        forward over several days shows up once, in its state on the last day it appears.
      </p>
      <p>
        A monthly sheet counts the month&apos;s daily sheets by their exact dates. Its Done groups
        are folded, with a count in each title (<code>#bug · 7</code>); open one to see the list. It
        also collects the Notes you wrote in that month&apos;s weekly sheets, one{" "}
        <code>Week 41</code> section per week with a link to the weekly sheet. Weeks with empty Notes
        are left out.
      </p>
      <p>
        The generated part sits between two hidden marker lines, shown in the editor as a thin rule.
        <strong> Refresh rollup</strong> rewrites only that part. Your Notes, the heading and anything
        else you add outside it are kept exactly as you wrote them. If the sheet is open with unsaved
        changes, they are kept and saved along with the refresh. Changes you make inside the
        generated part are replaced on the next refresh.
      </p>
      <Callout type="tip">
        If you deleted the marker lines, Refresh rollup won&apos;t touch the sheet. Delete the sheet
        and run the command again to rebuild it.
      </Callout>
      <p>
        Rollup items are plain list items, not tasks, so they never show up on the Tasks page. To
        check something off, follow its link to the day and tick it there, then refresh.
      </p>
    </>
  ),
};
