import type { BuiltinPack } from "./template-packs";

// The Finance pack: small pipe tables with live formulas (see
// app/editor/utils/formula-engine.ts). Amounts start at 0 so the totals
// show from the first moment; whole-column refs (`=SUM(B)`) keep totals
// right when rows are added. A table is named by the heading right above
// it, so nothing may sit between a heading and its table. Never put an
// empty first or last cell in a row: the parser drops it.

const lines = (body: string[]) => [...body, ""].join("\n");

// Income and expenses as two lists; the summary sums each by name, so
// adding a row to either needs no formula change.
const MONTHLY_BUDGET = lines([
  "# Budget {{date:MMMM YYYY}}",
  "",
  "## Income",
  "",
  "| Source | Amount |",
  "|---|---|",
  "| Salary | 0 |",
  "| Other | 0 |",
  "",
  "## Expenses",
  "",
  "| Item | Amount |",
  "|---|---|",
  "| Rent | 0 |",
  "| Groceries | 0 |",
  "| Utilities | 0 |",
  "| Transport | 0 |",
  "",
  "## Summary",
  "",
  "| Total | Amount |",
  "|---|---|",
  "| Income | =SUM(Income!B) |",
  "| Expenses | =SUM(Expenses!B) |",
  "| Left over | =B2-B3 |",
]);

const EXPENSE_LOG = lines([
  "# Expenses {{date:MMMM YYYY}}",
  "",
  "| Date | Item | Category | Amount |",
  "|---|---|---|---|",
  "| {{date}} | {{cursor}} | Food | 0 |",
  "| Total | | | =SUM(D) |",
]);

const SAVINGS_GOALS = lines([
  "# Savings goals",
  "",
  "| Goal | Target | Saved | Left |",
  "|---|---|---|---|",
  "| Emergency fund | 0 | 0 | =B2-C2 |",
  "| Holiday | 0 | 0 | =B3-C3 |",
  "| Total | =SUM(B) | =SUM(C) | =SUM(D) |",
]);

const SUBSCRIPTIONS = lines([
  "# Subscriptions",
  "",
  "| Service | Monthly | Yearly |",
  "|---|---|---|",
  "| Streaming | 0 | =B2*12 |",
  "| Cloud storage | 0 | =B3*12 |",
  "| Total | =SUM(B) | =SUM(C) |",
]);

export const FINANCE_PACK: BuiltinPack = {
  id: "finance",
  name: "Finance",
  description: "Budgets, expenses, savings and subscriptions as tables that add themselves up.",
  templates: [
    { name: "Monthly budget", description: "Income, expenses and what's left over", body: MONTHLY_BUDGET },
    { name: "Expense log", description: "One row per purchase, with a running total", body: EXPENSE_LOG },
    { name: "Savings goals", description: "Target, saved so far, and what's left", body: SAVINGS_GOALS },
    { name: "Subscriptions", description: "Monthly cost of each, and the yearly total", body: SUBSCRIPTIONS },
  ],
};
