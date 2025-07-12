import React from "react";

export default function FAQContent() {
  const faqItems = [
    {
      question: "What is Hermes Markdown?",
      answer:
        "Hermes Markdown is a modern, privacy-focused markdown editor that operates entirely offline. It provides a distraction-free environment for writing and editing markdown files with real-time preview.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely! Hermes Markdown operates entirely offline, meaning your content never leaves your device. All your files and data stay local and secure.",
    },
    {
      question: "What features does it offer?",
      answer:
        "Hermes Markdown includes real-time preview, templates, keyboard shortcuts, timer functionality, and export capabilities. It's designed to enhance your writing workflow.",
    },
    {
      question: "Is it free to use?",
      answer:
        "Yes! Hermes Markdown is completely free to use. There are no hidden costs or premium features - everything is available to all users.",
    },
    {
      question: "Can I export my files?",
      answer:
        "Yes, you can export your markdown files in various formats including PDF, HTML, and plain markdown. The export functionality is built right into the editor.",
    },
  ];

  return (
      <section id="faq" className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-xl mx-auto px-4 prose prose-gray dark:prose-invert text-center">
          <h2 className="text-3xl font-semibold mb-8">
            Frequently Asked Questions
          </h2>
          {/* FAQ Items */}
          {faqItems.map((faq, index) => (
            <details
              key={index}
              className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4 cursor-pointer"
            >
              <summary className="text-lg font-medium">{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
  );
}
