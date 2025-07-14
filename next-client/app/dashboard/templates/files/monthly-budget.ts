import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const MonthlyBudgetTemplate: MarkdownTemplate = {
  filename: "budget-month",
  frontMatter: {
    title: "Monthly Budget",
    description: `This monthly budget template helps you track income, expenses, and savings with clear sections for fixed and variable costs.`,
    tags: "budget,finance",
  },
  content: `# 💰 Monthly Budget
**Created:** ${date}
**Month:** [Month and Year]
---
## 💸 Income
- Total Income: $[Amount]
---
## 🏠 Expenses
- Housing: $[Amount]
- Food: $[Amount]
- Transportation: $[Amount]
- Utilities: $[Amount]
- Entertainment: $[Amount]
- Other: $[Amount]
- Total Expenses: $[Amount]
---
## 💡 Savings & Investments
- Savings: $[Amount]
- Investments: $[Amount]
- Emergency Fund: $[Amount]
- Total Savings: $[Amount]
---
## 🎯 Summary
- Total Income: $[Amount]
- Total Expenses: $[Amount]
- Total Savings: $[Amount]
- Remaining Balance: $[Amount]
---
## 📊 Goals
- [ ] Emergency Fund: $[Target] / $[Current]
- [ ] Investment Goal: $[Target] / $[Current]
- [ ] Save 20% of income`,
};

export default MonthlyBudgetTemplate;
