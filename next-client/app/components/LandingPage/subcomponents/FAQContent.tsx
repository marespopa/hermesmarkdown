import React from "react";

export default function FAQContent() {
  const faqItems = [
    {
      question: "What is Hermes Markdown?",
      answer:
        "Hermes Markdown is a modern, privacy-focused markdown editor that operates entirely offline. It provides a distraction-free environment for writing and editing markdown files with real-time preview. Perfect for writers, developers, students, and professionals who need a reliable tool for creating well-formatted documents.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Absolutely! Hermes Markdown operates entirely offline, meaning your content never leaves your device. All your files and data stay local and secure. This privacy-first approach ensures that your sensitive information, personal notes, and confidential documents remain completely under your control.",
    },
    {
      question: "What features does it offer?",
      answer:
        "Hermes Markdown includes real-time preview, professional templates, keyboard shortcuts, Pomodoro timer functionality, and export capabilities. It's designed to enhance your writing workflow with features like syntax highlighting, auto-save, and multiple export formats including PDF and HTML.",
    },
    {
      question: "Is it free to use?",
      answer:
        "Yes! Hermes Markdown is completely free to use. There are no hidden costs or premium features - everything is available to all users. We believe in providing powerful tools without barriers to access.",
    },
    {
      question: "Can I export my files?",
      answer:
        "Yes, you can export your markdown files in various formats including PDF, HTML, and plain markdown. The export functionality is built right into the editor, making it easy to share your work or convert it for different purposes.",
    },
    {
      question: "What makes Hermes Markdown different?",
      answer:
        "Hermes Markdown stands out for its privacy-first approach, offline functionality, and user-friendly interface. Unlike cloud-based editors, your data never leaves your device. The real-time preview and professional templates help you create beautiful documents quickly and efficiently.",
    },
    {
      question: "Do I need to install anything?",
      answer:
        "No installation required! Hermes Markdown runs entirely in your web browser. Simply visit the website and start writing immediately. Your work is saved locally in your browser, so you can access it anytime without any setup.",
    },
    {
      question: "Can I use it for technical documentation?",
      answer:
        "Absolutely! Hermes Markdown is perfect for technical documentation, README files, API documentation, and code tutorials. The markdown syntax supports code blocks, tables, and all the formatting you need for professional technical writing.",
    },
  ];

  return (
      <section id="faq" className="py-16 bg-white dark:bg-neutral-900">
        <div className="max-w-xl mx-auto px-4 prose prose-neutral dark:prose-invert text-center">
          <h2 className="text-3xl font-semibold mb-8">
            Frequently Asked Questions
          </h2>
          {/* FAQ Items */}
          {faqItems.map((faq, index) => (
            <details
              key={index}
              className="mb-4 border-b border-neutral-200 dark:border-neutral-700 pb-4 cursor-pointer"
            >
              <summary className="text-lg font-medium">{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
  );
}
