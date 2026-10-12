import { Callout, KV, type Subsection } from "../doc-primitives";

// Documentation content: Daily to yearly (Get Started, after Quick jot). The
// id stays "daily-weekly-monthly" so existing links keep working.
export const rollupsItem: Subsection = {
  id: "daily-weekly-monthly",
  title: "Daily to yearly",
  lead: "Write each day. Your weeks, months, quarters and years are built from your days, ready to read, edit or share.",
  keywords:
    "weekly monthly quarterly yearly annual rollup week month quarter year review retrospective switcher navigate previous next day status report summary worklog daily sheet refresh blocked live update tick check off progress",
  body: (
    <>
      <p>Your worklog has five levels. Each one is a plain note in your vault.</p>
      <KV
        rows={[
          { label: "Daily sheet", value: "2026-10-09.md, one per day" },
          { label: "Weekly sheet", value: "2026-W41.md, an ISO week from Monday to Sunday" },
          { label: "Monthly sheet", value: "2026-10.md, a calendar month" },
          { label: "Quarterly sheet", value: "2026-Q4.md, a calendar quarter (Q1 is January to March)" },
          { label: "Yearly sheet", value: "2026-year.md, a calendar year" },
        ]}
      />
      <p>
        A week belongs to the year that holds its Thursday, so the week from Dec 28, 2026 to Jan 3,
        2027 is <code>2026-W53</code>. All of these sheets go in your Daily Sheets Folder (Settings →
        Files). If that folder has <code>{"{{month}}"}</code> in it, a week that spans two months goes
        in the month that holds its Thursday, a monthly sheet goes in its own month, and quarterly
        and yearly sheets go in the folder of their first month.
      </p>
      <KV
        rows={[
          { label: "This week's sheet / Last week's sheet", value: "Open the week's sheet, or create it" },
          { label: "This month's sheet / Last month's sheet", value: "Open the month's sheet, or create it" },
          { label: "This quarter's sheet / Last quarter's sheet", value: "Open the quarter's sheet, or create it" },
          { label: "This year's sheet / Last year's sheet", value: "Open the year's sheet, or create it" },
          { label: "Refresh rollup", value: "Rebuild the generated part of the open weekly, monthly, quarterly or yearly sheet" },
        ]}
      />
      <p>
        At the top of every worklog sheet, a line moves you between them:{" "}
        <strong>Day · Week · Month · Quarter · Year</strong> on the left, each with its own colour
        (days clay, weeks green, months slate, quarters plum, years ochre), and{" "}
        <strong>‹ date ›</strong> on the right. Each level jumps to the sheet for the same date at
        that level: Oct 6 → week 41 → October → Q4 → 2026. The arrows step back
        and forward at the current level. Days skip to the nearest day that has a sheet, and stepping
        forward from your latest one goes to today. Nothing goes past today, and browsing never
        creates empty sheets for past days; a weekly, monthly, quarterly or yearly sheet that
        doesn&apos;t exist yet is built when you open it. Sheet tabs carry the same coloured dot, and
        the home feed has a <strong>Today · This week · This month · This quarter · This year</strong>{" "}
        line under the stats.
      </p>
      <p>
        You can also run them from the command palette. <strong>Last week&apos;s sheet</strong> on a Monday
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
        Quarterly and yearly sheets work the same way. Their numbers come from the daily sheets of
        the whole period, with Done folded like a month&apos;s. The story comes from one level
        down: a quarterly sheet collects the Notes of its three monthly sheets, and a yearly sheet
        the Notes of its four quarterly sheets. So the Notes you write each month become your
        quarterly review, and those become your year. Export any of them as a PDF to share or
        keep (see Export as PDF).
      </p>
      <p>
        The generated part sits between two hidden marker lines, shown in the editor as a thin rule
        with a caption saying when it was last updated (<em>From your daily sheets · updated 2 min
        ago</em>). It keeps itself current: it is rebuilt when you open the sheet or switch back to
        its tab, when you come back to the window, and, while the sheet is showing, a moment after
        you save one of the days it covers (or, for a month, quarter or year, a sheet one level
        down). Lines that just came in glow softly for a second. <strong>Refresh rollup</strong>{" "}
        does the same on demand.
      </p>
      <p>
        Only the generated part is rewritten. Your Notes, the heading and anything else you add
        outside it are kept exactly as you wrote them, and unsaved changes in the open sheet are kept
        and saved along with the update. Everything stays editable, but changes you make inside the
        generated part are replaced on the next update.
      </p>
      <Callout type="tip">
        If you deleted the marker lines, the sheet is no longer rebuilt. Delete the sheet and open it
        again to rebuild it.
      </Callout>
      <p>
        The summary line shows as a small strip with a done bar in the sheet&apos;s colour, and the
        Day · Week · Month line shows the same bar next to the date. Items under{" "}
        <strong>Blocked</strong> and <strong>Still open</strong> have a box: tick it and the task is
        checked off in its daily sheet, and the item moves to Done. Ctrl/Cmd+click an item&apos;s day
        link, like <code>[[2026-10-06]]</code>, to open that day with the cursor on the task.
      </p>
      <p>
        Rollup items are plain list items, not tasks, so they never show up on the Tasks page or count
        twice.
      </p>
    </>
  ),
};
