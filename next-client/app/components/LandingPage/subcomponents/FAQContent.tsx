"use client";

import React, { useState } from "react";

export default function FAQContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const faqCategories = {
    gettingStarted: {
      title: "Getting Started",
      items: [
        {
          question: "What is Hermes Markdown?",
          answer: "Hermes Markdown is a specialized markdown editor built for prompt engineering. It helps you craft, test, and refine AI prompts with real-time preview, built-in prompt templates, token estimation, and task structuring. Perfect for working with AI models, building system prompts, and developing few-shot examples.",
        },
        {
          question: "Do I need to create an account?",
          answer: "No! Hermes Markdown requires no registration, no email, and no personal information. Simply open the website and start crafting prompts immediately. Your work is saved locally in your browser.",
        },
        {
          question: "Do I need to install anything?",
          answer: "No installation required! Hermes Markdown runs entirely in your web browser. Simply visit the website and start writing. Your work is saved locally in your browser, so you can access it anytime without any setup.",
        },
        {
          question: "Is it free to use?",
          answer: "Yes! Hermes Markdown is completely free to use. There are no hidden costs, premium features, or subscription fees - everything is available to all users.",
        },
      ]
    },
    prompting: {
      title: "Prompt Engineering",
      items: [
        {
          question: "What prompt templates are available?",
          answer: "Hermes Markdown includes 30+ specialized templates organized by use case: Prompt Foundation (/structure, /success, /constraints), Content Transformation (/summarize, /rewrite, /explain), Content Generation (/idea, /steps, /email), and Technical (/documentation, /refactor, /test). Type '/' in the editor to see all available templates with autocomplete.",
        },
        {
          question: "How do I use the prompt templates?",
          answer: "Press '/' in the editor to open the command bar with autocomplete. Type to search templates (e.g., '/task' for task prompts, '/critique' for feedback), or browse by category. Select a template to insert it. Templates include placeholders like {task}, {audience}, {constraints} that you customize for your specific prompt.",
        },
        {
          question: "What is the Task Prompt Generator?",
          answer: "The Task Prompt Generator is a comprehensive template for creating structured, research-backed prompts. It guides you through spec-first development with phases for understanding, planning, and verification. Perfect for complex tasks where clarity and detailed requirements matter. Includes frameworks like constraint prioritization (MUST/SHOULD/MUST NOT) and multi-perspective reflection.",
        },
        {
          question: "How do I structure a good prompt?",
          answer: "Start with the /structure template to scaffold the basics: Role, Context, Task, Constraints, and Output format. Use /success to define what done means. Add /output for format requirements and /examples for few-shot learning. Use /constraints to clarify scope and assumptions. The templates guide you toward research-backed prompt patterns that work better with LLMs.",
        },
        {
          question: "Can I create custom templates?",
          answer: "Yes! You can save any prompt as a markdown file and import it later. Templates support YAML frontmatter for metadata like title, description, and tags. Export your best prompts and share them with your team or use them across projects.",
        },
      ]
    },
    quality: {
      title: "Token Counting & Quality",
      items: [
        {
          question: "How does token counting work?",
          answer: "Hermes Markdown automatically estimates token count using the formula: word count × 1.35 (a safe approximation for LLM token count). See your token count in real-time as you write. This helps you stay within context windows and optimize prompt length for your LLM.",
        },
        {
          question: "What is the reading ease score?",
          answer: "Hermes Markdown calculates a Flesch Reading Ease score to measure prompt clarity. Higher scores (60+) indicate clearer prompts that LLMs will better understand. Use this to refine wording and remove ambiguity—especially important for system prompts where clarity directly affects model behavior.",
        },
        {
          question: "How do I optimize my prompts?",
          answer: "Use the /verify template to create a checklist of quality gates: Is it specific? Does it include examples? Are constraints clear? Then use /critique to highlight gaps and logic issues. Iterate with /iterate to refine based on feedback. The combination helps catch ambiguity before sending prompts to AI.",
        },
        {
          question: "What is few-shot prompting?",
          answer: "Few-shot prompting means providing 1-3 examples of inputs and expected outputs to guide the model. Use the /examples template to structure examples clearly. Include diverse cases to show the model the pattern. Few-shot prompting typically improves accuracy 10-30% depending on task complexity.",
        },
      ]
    },
    features: {
      title: "Features & Workflow",
      items: [
        {
          question: "What is the table editor?",
          answer: "The table editor (Ctrl+Shift+T) makes markdown tables simple. Add rows and columns, edit cell content, and preview your table before inserting. Useful for comparison tables in prompts, structured data requirements, or output format specifications.",
        },
        {
          question: "What about the timer?",
          answer: "The timer helps you track focused work sessions. Useful when brainstorming prompt variations, testing approaches, or during deep work. Set a duration and focus without distractions.",
        },
        {
          question: "Can I customize fonts and themes?",
          answer: "Yes! Choose from multiple monospace fonts, adjust font sizes for comfort, and toggle between light and dark themes. The editor adapts to your preferences for the best writing experience.",
        },
      ]
    },
    export: {
      title: "Export & Sharing",
      items: [
        {
          question: "Can I export my prompts?",
          answer: "Yes! Export as clean markdown files (.md) to use with other tools, or as PDF for sharing with non-technical stakeholders. Your YAML frontmatter metadata (title, tags, description) travels with exported markdown files.",
        },
        {
          question: "Can I import existing prompts or markdown?",
          answer: "Yes! Import existing .md files from your device. Hermes Markdown preserves your formatting and YAML frontmatter. Great for migrating prompts from other editors or loading files you've previously exported.",
        },
        {
          question: "How do I share prompts with my team?",
          answer: "Export your prompts as markdown files and share via email, Slack, or version control. Since everything is markdown with YAML metadata, prompts work on any platform. Teams can version control prompts in Git to track evolution and collaborate.",
        },
        {
          question: "How do I save my work?",
          answer: "Your work is automatically saved as you type in your browser's local storage. You can also export documents as markdown or PDF to keep permanent copies on your device or share with others.",
        },
      ]
    },
    privacy: {
      title: "Privacy & Data",
      items: [
        {
          question: "Is my prompt data secure?",
          answer: "Absolutely! Hermes Markdown operates entirely offline, meaning your prompt content never leaves your device. All your files and data stay local and secure. This privacy-first approach ensures that your sensitive prompts, proprietary techniques, and confidential AI strategies remain completely under your control.",
        },
        {
          question: "Do you collect any data about my prompts?",
          answer: "No, we don't collect any personal data, usage statistics, or prompt content from your documents. Everything stays on your device. We don't use analytics, tracking, or any data collection methods. Your prompts are yours alone.",
        },
        {
          question: "Can I use Hermes Markdown offline?",
          answer: "Yes! Once you've loaded the website, Hermes Markdown works completely offline. You can write, edit, and export prompts without an internet connection. Your work is stored locally in your browser.",
        },
        {
          question: "What happens if I clear my browser data?",
          answer: "If you clear your browser's local storage, your saved prompts will be deleted. However, you can export your prompts as markdown before clearing data to keep permanent copies. We recommend regularly exporting important prompts.",
        }
      ]
    }
  };

  const allFaqItems = Object.values(faqCategories).flatMap(category => category.items);
  
  const filteredItems = allFaqItems.filter(item => 
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryItems = (categoryKey: string) => {
    if (categoryKey === "all") {
      return filteredItems;
    }
    return faqCategories[categoryKey as keyof typeof faqCategories]?.items.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  };

  return (
    <section id="faq" className="py-16 bg-white dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4 text-neutral-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-8">
            Find answers to common questions about Hermes Markdown
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              All Questions
            </button>
            {Object.entries(faqCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-6">
          {getCategoryItems(activeCategory).map((faq, index) => (
            <details
              key={index}
              className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 cursor-pointer border border-neutral-200 dark:border-neutral-700"
            >
              <summary className="text-lg font-semibold text-neutral-900 dark:text-white mb-2 cursor-pointer list-none">
                {faq.question}
                <svg className="inline-block w-5 h-5 ml-2 transform transition-transform group-open:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <p className="text-neutral-700 dark:text-neutral-300 mt-3 leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
          
          {getCategoryItems(activeCategory).length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-600 dark:text-neutral-400">
                No questions found matching &quot;{searchTerm}&quot;. Try a different search term or browse all categories.
              </p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="text-center mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <a
            href="/documentation"
            className="inline-flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            View Full Documentation
          </a>
        </div>
      </div>
    </section>
  );
}
