import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const CodeSnippetTemplate: MarkdownTemplate = {
  filename: "code-snippet",
  frontMatter: {
    title: "Code Snippet",
    description: `Document and organize useful code snippets, functions, and utilities for easy reference and reuse.`,
    tags: "code,snippet,function,utility,developer,programming",
  },
  content: `# 💻 Code Snippet
**Name:** 
**Language:** 
**Category:** 
**Created:** ${date}
**Last Updated:** ${date}

---

## 📝 Description

**Purpose:** 

**Use Case:** 

**Dependencies:** 

---

## 🔧 Implementation

### Code

\`\`\`

\`\`\`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
|           |      |          |             |
|           |      |          |             |
|           |      |          |             |

### Return Value

| Type | Description |
|------|-------------|
|      |             |

---

## 📋 Usage Examples

### Example 1: Basic Usage

\`\`\`

\`\`\`

### Example 2: Advanced Usage

\`\`\`

\`\`\`

---

## ⚠️ Notes & Warnings

- 
- 

---

## 🔄 Related Snippets

| Name | Language | Link |
|------|----------|------|
|      |          |      |
|      |          |      |

---

## 📚 References

- 
- 
`,
};

export default CodeSnippetTemplate; 