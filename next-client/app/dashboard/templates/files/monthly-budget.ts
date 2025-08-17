import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();
const year = DateUtils.getCurrentYear();
const month = DateUtils.getCurrentMonth();

const MonthlyBudgetTemplate: MarkdownTemplate = {
  filename: "budget-month",
  frontMatter: {
    title: "Monthly Budget",
    description: `A simple monthly budget template for tracking income, expenses, and savings.`,
    tags: "budget,finance",
  },
  content: `# 💰 Monthly Budget
**Date:** ${month} ${year}

---

## 💸 Income

- Salary: 
- Other: 
- **Total Income:** 

---

## 🏠 Expenses

- Rent/Mortgage: 
- Utilities: 
- Food: 
- Transportation: 
- Entertainment: 
- **Total Expenses:** 

---

## 💡 Savings

- Emergency Fund: 
- Investments: 
- **Total Savings:** 

---

## 🎯 Summary

**Remaining Balance:** 
**Notes:** 
`,
};

export default MonthlyBudgetTemplate;
