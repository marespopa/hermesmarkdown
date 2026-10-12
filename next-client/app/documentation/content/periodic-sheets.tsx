import { Callout, Code, KV, type Subsection } from "../doc-primitives";

// Documentation content: Daily to yearly (Get Started, after the home feed). The
// id stays "daily-weekly-monthly" so existing links keep working.
export const periodicSheetsItem: Subsection = {
  id: "daily-weekly-monthly",
  title: "Daily to yearly",
  lead: "Write each day. Give your weeks, months, quarters and years a sheet of their own, shaped by your templates.",
  keywords:
    "weekly monthly quarterly yearly annual week month quarter year review retrospective switcher navigate previous next day status report worklog daily sheet template weekly template monthly template focus plan goals",
  body: (
    <>
      <p>Your worklog has five levels. Each one is a plain note in your vault, and every word in it is yours.</p>
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
        ]}
      />
      <p>
        At the top of every worklog sheet, a line moves you between them:{" "}
        <strong>Day · Week · Month</strong> on the left, each with its own colour (days clay, weeks
        green, months slate), and{" "}
        <strong>‹ date ›</strong> on the right. Each level jumps to the sheet for the same date at
        that level: Oct 6 → week 41 → October. <strong>Quarter</strong> (plum) and{" "}
        <strong>Year</strong> (ochre) join the line once you have a quarterly or yearly sheet; open
        one from the command palette the first time. The arrows step back
        and forward at the current level. Days skip to the nearest day that has a sheet, and stepping
        forward from your latest one goes to today. Nothing goes past today, and browsing never
        creates empty sheets for past days; a weekly, monthly, quarterly or yearly sheet that
        doesn&apos;t exist yet is created when you open it. Sheet tabs carry the same coloured dot.
      </p>
      <p>
        You can also run them from the command palette. <strong>Last week&apos;s sheet</strong> on a Monday
        morning and <strong>Last month&apos;s sheet</strong> on the 1st are for the period that just
        ended. If the sheet already exists, it opens as it is. The commands need an open vault.
      </p>
      <h4 className="text-[19px] font-semibold tracking-tight !mb-2 !mt-6">Shape them with templates</h4>
      <p>
        A new weekly, monthly, quarterly or yearly sheet starts as a heading. Create a template named{" "}
        <strong>Weekly</strong>, <strong>Monthly</strong>, <strong>Quarterly</strong> or{" "}
        <strong>Yearly</strong> (see Templates) and each new sheet of that level starts from it
        instead. Its dates are the period&apos;s, so last month&apos;s sheet says October even on
        November 1. After that the sheet is yours: the app never changes it.
      </p>
      <p>
        Four extra fields work here: <code>{"{{period}}"}</code> (the sheet&apos;s name, like{" "}
        <code>2026-W42</code>), <code>{"{{periodHeading}}"}</code>, and{" "}
        <code>{"{{previousPeriod}}"}</code> / <code>{"{{nextPeriod}}"}</code> for links to the sheets
        either side. A starting point for your Weekly template:
      </p>
      <Code>
        {"---\ntype: weekly\n---\n# {{periodHeading}}\n\n## Focus\n- [ ] {{cursor}}\n- [ ] \n- [ ] \n\n## Retrospective\n- What went well?\n- Where did momentum stall?\n- Adjustments for next week:\n\n← [[{{previousPeriod}}]] · [[{{nextPeriod}}]] →"}
      </Code>
      <p>
        In your daily template, <code>{"[[{{weekSheet}}]]"}</code> links each day to its week; see
        Templates for the other sheet names.
      </p>
      <Callout type="tip">
        Want a summary of your week? Ask AI Chat for a <strong>weekly review</strong>: it reads the
        week&apos;s daily sheets and writes one you can paste into your weekly sheet.
      </Callout>
    </>
  ),
};
