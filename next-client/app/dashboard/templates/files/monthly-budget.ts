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

| Source    | Amount   |
|-----------|----------|
| Salary    |          |
| Other     |          |
| **Total** |          |

---

## 🏠 Expenses

| Category        | Amount   |
|-----------------|----------|
| Category 1      |          |
| **Total**       |          |

---

## 💡 Savings & Investments

| Type           | Amount   |
|----------------|----------|
| Savings        |          |
| Investments    |          |
| Emergency Fund |          |
| **Total**      |          |

---

## 🎯 Summary

| Category          | Amount   |
|-------------------|----------|
| Total Income      |          |
| Total Expenses    |          |
| Total Savings     |          |
| Remaining Balance |          |

---

## 📊 Goals

| Goal               | Target   | Current | Status |
|--------------------|----------|---------|--------|
| Emergency Fund     |          |         | [ ]    |
| Investment Goal    |          |         | [ ]    |
| Save 20% of income |          |         | [ ]    |
`,
};

export default MonthlyBudgetTemplate;
