import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const TabularDataTemplate: MarkdownTemplate = {
  filename: "tabular-data",
  frontMatter: {
    title: "Tabular Data",
    description: `A template for organizing data in table format.`,
    tags: "data,table,organization,tabular",
  },
  content: `# 📊 Tabular Data

**Created On:** ${date}

---

## 📈 Data Table
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
|          |          |          |
|          |          |          |
|          |          |          | 

---

## 📝 Notes
- Use this template for organizing structured data
- Add your data to the table above
- Modify columns and rows as needed
- You can use the table editor for easier table management
`,
};

export default TabularDataTemplate; 