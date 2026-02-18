# Hermes Markdown

### The Engineering Studio for High-Precision Prompting.

Hermes Markdown is a **local-first, privacy-centric** Markdown editor architected for software engineers and AI practitioners. It transforms Markdown from a simple documentation format into a structured **Prompt IDE**, featuring real-time logic metrics and a specialized command system for deterministic AI outputs.

## 🛠 Key Features

* **Logic Guard (Real-time Analytics)**: Beyond word counts—get instant feedback on prompt clarity, token density, and structural integrity as you write.
* **Slash Command Autocomplete**: Execute `/task`, `/role`, or `/skill` to instantly inject complex, "hardened" prompt templates.
* **Local-First Architecture**: Your data never leaves your browser. Hermes works 100% offline using `localStorage` and `IndexedDB` for persistence.
* **Integrated Productivity Suite**: A docked, non-intrusive status bar timer designed for deep-work sessions without UI obstruction.
* **Local PDF Export**: High-fidelity PDF generation performed entirely on the client side for professional documentation.
* **No Sign-up / No Tracking**: Access a professional-grade workspace instantly. We don't train models on your data.

## 🚀 Why Hermes Markdown?

Standard editors treat Markdown as text; Hermes treats it as **logic**. 

In the era of LLMs, the quality of your output is a direct function of your input structure. Hermes provides the guardrails and automated templates necessary to move from "chatting" to **Prompt Engineering**. Whether you are building `skill.md` files or complex JSON output contracts, Hermes ensures your Markdown is production-ready.



## ⌨️ Tech Stack

* **Framework**: Next.js (SSG for zero-latency)
* **Styling**: Tailwind CSS
* **Editor**: Custom implementation via `react-simple-code-editor`
* **State**: React Context + Local Storage Persistence

## 📦 Status

[![Netlify Status](https://api.netlify.com/api/v1/badges/791876b3-c7fe-43c6-850e-6cc486395ba1/deploy-status)](https://app.netlify.com/sites/hermesmd/deploys)

---

## 🤝 Contributing

Hermes is built by engineers, for engineers. If you have a high-performance prompt template or a specialized `/skill` module, feel free to open a Pull Request.

1. Fork the repo
2. Add your template to `src/app/dashboard/editor/organisms/PromptCommandBar/prompt-templates.ts`
3. Submit a PR!

