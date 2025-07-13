import React from "react";

export default function MarkdownGuide() {
  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4">
            Master Markdown with Hermes
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Markdown is a lightweight markup language that makes writing and formatting text simple and efficient. 
            Learn the essential syntax to create beautiful, well-structured documents.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-emerald-600">Headers & Structure</h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded"># H1 Header</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">## H2 Header</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">### H3 Header</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Use headers to organize your content hierarchically. Perfect for creating clear document structure.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-emerald-600">Text Formatting</h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">**Bold Text**</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">*Italic Text*</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">~~Strikethrough~~</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Emphasize important information and create visual hierarchy in your documents.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-emerald-600">Lists & Organization</h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">- Unordered list</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">1. Ordered list</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">- [ ] Task list</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Organize information clearly with various list types for better readability.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-emerald-600">Links & Media</h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">[Link Text](URL)</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">![Alt Text](image.jpg)</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Add interactive elements and visual content to enhance your documents.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-emerald-600">Code & Technical</h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">`inline code`</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">```code block```</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Perfect for technical documentation, tutorials, and code examples.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-emerald-600">Tables & Data</h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">| Header | Header |</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">|--------|--------|</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">| Cell   | Cell   |</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Present data in organized tables for better comparison and analysis.
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Ready to start writing? Hermes Markdown provides real-time preview so you can see your formatting instantly.
          </p>
          <a 
            href="/documentation" 
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Learn More About Markdown
          </a>
        </div>
      </div>
    </section>
  );
} 