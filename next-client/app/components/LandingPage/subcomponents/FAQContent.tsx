import React from "react";

export default function FAQContent() {
  const faqItems = [
    {
      question: "What is Hermes Markdown?",
      answer:
        "Hermes Markdown is a modern markdown editor designed for privacy. It operates entirely offline, ensuring your data stays secure and local.",
    },
    {
      question: "Is it free?",
      answer: "Hermes Markdown is 100% free. It is designed as a completely free tool, created to help you work with Markdown effortlessly, without any cost."
    },
    {
      question: "Does Hermes Markdown store my data in the cloud?",
      answer:
        "No, Hermes Markdown does not store any data in the cloud. All your content stays on your device.",
    },
    {
      question: "Can I use Hermes Markdown on any device?",
      answer:
        "Yes, Hermes Markdown works seamlessly on any modern browser, making it compatible with desktops, laptops, and mobile devices.",
    },
    {
      question: "Can I export my work from Hermes Markdown?",
      answer:
        "You can easily export your work as markdown file or pdf for sharing or publishing purposes.",
    },
    {
      question: "Is Hermes Markdown really free?",
      answer: "Yes! Hermes Markdown is completely free to use. There are no hidden fees, subscriptions, or premium plans. You can enjoy all its features without any cost."
    }
  ];

  return (
      <section id="faq" className="py-16 bg-white">
        <div className="max-w-xl mx-auto px-4 prose prose-gray text-center">
          <h2 className="text-3xl font-semibold mb-8">
            Frequently Asked Questions
          </h2>
          {/* FAQ Items */}
          {faqItems.map((faq, index) => (
            <details
              key={index}
              className="mb-4 border-b border-gray-200 pb-4 cursor-pointer"
            >
              <summary className="text-lg font-medium">{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
  );
}
