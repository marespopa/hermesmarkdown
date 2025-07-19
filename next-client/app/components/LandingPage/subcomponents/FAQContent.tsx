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
          answer: "Hermes Markdown is a modern, privacy-focused markdown editor that operates entirely offline. It provides a distraction-free environment for writing and editing markdown files with real-time preview. Perfect for writers, developers, students, and professionals who need a reliable tool for creating well-formatted documents.",
        },
        {
          question: "Do I need to create an account?",
          answer: "No! Hermes Markdown requires no registration, no email, and no personal information. Simply open the website and start writing immediately. Your work is saved locally in your browser.",
        },
        {
          question: "Do I need to install anything?",
          answer: "No installation required! Hermes Markdown runs entirely in your web browser. Simply visit the website and start writing immediately. Your work is saved locally in your browser, so you can access it anytime without any setup.",
        },
        {
          question: "Is it free to use?",
          answer: "Yes! Hermes Markdown is completely free to use. There are no hidden costs, premium features, or subscription fees - everything is available to all users.",
        },
      ]
    },
    privacy: {
      title: "Privacy & Security",
      items: [
        {
          question: "Is my data secure?",
          answer: "Absolutely! Hermes Markdown operates entirely offline, meaning your content never leaves your device. All your files and data stay local and secure. This privacy-first approach ensures that your sensitive information, personal notes, and confidential documents remain completely under your control.",
        },
        {
          question: "Do you collect any data?",
          answer: "No, we don't collect any personal data, usage statistics, or content from your documents. Everything stays on your device. We don't use analytics, tracking, or any data collection methods.",
        },
        {
          question: "Can I use it offline?",
          answer: "Yes! Once you've loaded the website, Hermes Markdown works completely offline. You can write, edit, and save documents without an internet connection. Your work is stored locally in your browser.",
        },
      ]
    },
    features: {
      title: "Features & Functionality",
      items: [
        {
          question: "What features does it offer?",
          answer: "Hermes Markdown includes real-time preview, professional templates, table editor, keyboard shortcuts, Zen mode for distraction-free writing, timer functionality, and export capabilities. It's designed to enhance your writing workflow with features like syntax highlighting and auto-save.",
        },
        {
          question: "Can I create tables easily?",
          answer: "Yes! The built-in table editor makes creating and editing markdown tables simple. Add rows and columns, edit cell content, and preview your tables before inserting them into your document. No need to write table syntax manually.",
        },
        {
          question: "What is Zen mode?",
          answer: "Zen mode provides a distraction-free writing environment by centering the editor and hiding all other interface elements. Perfect for focused writing sessions. Press Esc to exit Zen mode.",
        },
        {
          question: "Can I use templates?",
          answer: "Yes! Hermes Markdown includes professional templates for various use cases like project documentation, meeting notes, and personal dashboards. Templates help you get started quickly with proper structure and formatting.",
        },
      ]
    },
    export: {
      title: "Export & Sharing",
      items: [
        {
          question: "Can I export my files?",
          answer: "Yes, you can export your markdown files to PDF for sharing or keep them as clean markdown files. The export functionality is built right into the editor, making it easy to share your work.",
        },
        {
          question: "Can I import existing markdown files?",
          answer: "Yes! You can import existing .md files from your device. Simply use the 'Import File' option to open and edit your existing markdown documents.",
        },
        {
          question: "How do I save my work?",
          answer: "Your work is automatically saved as you type. You can also export your documents to PDF or download them as markdown files. All content is stored locally in your browser.",
        },
      ]
    },
    technical: {
      title: "Technical & Usage",
      items: [
        {
          question: "Can I use it for technical documentation?",
          answer: "Absolutely! Hermes Markdown is perfect for technical documentation, README files, API documentation, and code tutorials. The markdown syntax supports code blocks, tables, and all the formatting you need for professional technical writing.",
        },
        {
          question: "What keyboard shortcuts are available?",
          answer: "Hermes Markdown includes comprehensive keyboard shortcuts: Ctrl+Shift+T for table editor, Ctrl+Shift+S to save, Ctrl+Shift+N for new file, Ctrl+Shift+O to open files, and many more. Check the documentation for a complete list.",
        },
        {
          question: "Can I customize the editor?",
          answer: "Yes! You can choose from multiple monospace fonts, adjust font sizes, and toggle between light and dark themes. The editor adapts to your preferences for the best writing experience.",
        },
        {
          question: "What makes Hermes Markdown different?",
          answer: "Hermes Markdown stands out for its privacy-first approach, offline functionality, and user-friendly interface. Unlike cloud-based editors, your data never leaves your device. The real-time preview, table editor, and professional templates help you create beautiful documents quickly and efficiently.",
        },
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
