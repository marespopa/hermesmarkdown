import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const SimpleNotesTemplate: MarkdownTemplate = {
  filename: "simple-notes",
  frontMatter: {
    title: "Simple Notes",
    description: `A clean and minimal template for quick note-taking. Perfect for capturing thoughts, ideas, and information without complex structure.`,
    tags: "notes,simple,minimal,quick",
  },
  content: `# 📝 Simple Notes

**Date:** ${date}

---

## ✨ Quick Notes

*Add your notes here*

---

## 💡 Ideas

- 
- 
- 

---

## 🔗 Links & References

- 
- 
- 

---

## 📋 To-Do

- [ ] 
- [ ] 
- [ ] 
`,
};

export default SimpleNotesTemplate; 