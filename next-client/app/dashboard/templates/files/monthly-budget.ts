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
  content: `# 💰 ${month} ${year} Monthly Budget

## 💸 Income

## 🏠 Expenses
	
## 🎯 Remaining Balance
Remaining Balance: 
`,
};

export default MonthlyBudgetTemplate;
