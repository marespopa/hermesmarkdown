import React from "react";
import Button from "../../Button";
import { useRouter } from "next/navigation";

export default function MarkdownGuide() {
  const router = useRouter();
  return (
    <section className="py-16 bg-neutral-50 dark:bg-neutral-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4">
            Master Markdown with Hermes
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto">
            Markdown is a lightweight markup language that makes writing and formatting text simple and efficient. 
            Learn the essential syntax to create beautiful, well-structured documents.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4"><span className="bg-amber-100 text-black px-2 py-1 rounded">Headers & Structure</span></h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded"># H1 Header</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">## H2 Header</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">### H3 Header</code></p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">
                Use headers to organize your content hierarchically. Perfect for creating clear document structure.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4"><span className="bg-amber-100 text-black px-2 py-1 rounded">Text Formatting</span></h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">**Bold Text**</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">*Italic Text*</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">~~Strikethrough~~</code></p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">
                Emphasize important information and create visual hierarchy in your documents.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4"><span className="bg-amber-100 text-black px-2 py-1 rounded">Lists & Organization</span></h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">- Unordered list</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">• Unordered list (orange)</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">1. Ordered list</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">- [ ] Task list</code></p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">
                Organize information clearly with various list types for better readability. Lists starting with • will appear in orange.
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4"><span className="bg-amber-100 text-black px-2 py-1 rounded">Links & Media</span></h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">[Link Text](URL)</code></p>
              <p><code className="bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded">![Alt Text](image.jpg)</code></p>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">
                Add interactive elements and visual content to enhance your documents.
              </p>
            </div>
          </div>
          
          {/* <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4"><span className="bg-amber-100 text-black px-2 py-1 rounded">Code & Technical</span></h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">`inline code`</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">```code block```</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Perfect for technical documentation, tutorials, and code examples.
              </p>
            </div>
          </div> */}
          
          {/* <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4"><span className="bg-amber-100 text-black px-2 py-1 rounded">Tables & Data</span></h3>
            <div className="space-y-2 text-sm">
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">| Header | Header |</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">|--------|--------|</code></p>
              <p><code className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">| Cell   | Cell   |</code></p>
              <p className="text-gray-600 dark:text-gray-400 mt-3">
                Present data in organized tables for better comparison and analysis.
              </p>
            </div>
          </div> */}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-4">
            Ready to start writing? Hermes Markdown provides real-time preview so you can see your formatting instantly.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/documentation")}
            styles="text-lg mx-auto"
          >
            Learn More About Markdown
          </Button>
        </div>
      </div>
    </section>
  );
} 