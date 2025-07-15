import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();
const year = DateUtils.getCurrentYear();
const month = DateUtils.getCurrentMonth();

const MonthlyBudgetTemplate: MarkdownTemplate = {
  filename: "budget-month",
  frontMatter: {
    title: "Monthly Budget",
    description: `This monthly budget template helps you track income, expenses, and savings with clear sections for fixed and variable costs.`,
    tags: "budget,finance",
  },
  content: `# 💰 Monthly Budget
**Created:** ${date}
**Month:** ${month} ${year}

---

## 💸 Income

| Source      | Amount   |
|-------------|----------|
| Salary      | $3200    |
| Other       | $200     |
| **Total**   | $3400    |

---

## 🏠 Expenses

| Category        | Amount   |
|-----------------|----------|
| Housing         | $1200    |
| Food            | $400     |
| Transportation  | $150     |
| Utilities       | $100     |
| Entertainment   | $80      |
| Other           | $70      |
| **Total**       | $2000    |

---

## 💡 Savings & Investments

| Type           | Amount   |
|----------------|----------|
| Savings        | $500     |
| Investments    | $300     |
| Emergency Fund | $200     |
| **Total**      | $1000    |

---

## 🎯 Summary

| Category        | Amount   |
|-----------------|----------|
| Total Income    | $3400    |
| Total Expenses  | $2000    |
| Total Savings   | $1000    |
| Remaining Balance | $400   |

---

## 📊 Goals

| Goal                | Target     | Current    | Status |
|---------------------|------------|------------|--------|
| Emergency Fund      | $1000      | $200       | [ ]    |
| Investment Goal     | $500       | $300       | [ ]    |
| Save 20% of income  | $680       | $500       | [ ]    |
`,
};

export default MonthlyBudgetTemplate;
