export default function Features() {
  return (
    <section className="py-16 bg-white dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 text-center prose prose-neutral dark:prose-invert">
        <h2 className="text-3xl font-semibold mb-8">
          Why Choose Hermes Markdown?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Live Markdown Preview</h3>
            <p>
              See your changes instantly with real-time markdown preview. Write in markdown syntax and <strong>preview the formatted output</strong> as you type.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Table Editor</h3>
            <p>
              Create and edit markdown tables with ease. Add rows and columns, edit cell content, and <strong>preview your tables</strong> before inserting them into your document.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Export to PDF & More</h3>
            <p>
              Instantly export your notes and documents to <strong>PDF</strong>, HTML, or plain markdown. Share, archive, or print your work with a single click.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Keyboard-Driven Productivity</h3>
            <p>
              Power through your workflow with <strong>keyboard shortcuts</strong> for every major action. Stay in the flow—no mouse required.
            </p>
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Rich Templates</h3>
            <p>
              Start with professionally designed templates for various use cases - from meeting notes to project documentation. 
              Save time and maintain consistency across your documents.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Zen Mode</h3>
            <p>
              Focus on your writing with distraction-free Zen Mode. Center the editor, hide distractions, and immerse yourself in your content for maximum productivity.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Privacy First</h3>
            <p>
              Your content never leaves your device. Everything stays local and
              secure. No data transmission to servers means complete control over your work.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
