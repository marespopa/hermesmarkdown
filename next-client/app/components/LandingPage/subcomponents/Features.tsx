export default function Features() {
  return (
    <section className="py-16 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 text-center prose prose-gray dark:prose-invert">
        <h2 className="text-3xl font-semibold mb-8">
          Why Choose Hermes Markdown?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            className={`bg-amber-100 dark:bg-gray-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Block-Based Editing</h3>
            <p>
              Enjoy a modern, block-style editor. Effortlessly create headings, lists, quotes, and <strong>code blocks</strong> with keyboard shortcuts and markdown syntax.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-gray-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Export to PDF & More</h3>
            <p>
              Instantly export your notes and documents to <strong>PDF</strong>, HTML, or plain markdown. Share, archive, or print your work with a single click.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-gray-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Keyboard-Driven Productivity</h3>
            <p>
              Power through your workflow with <strong>keyboard shortcuts</strong> for every major action. Stay in the flow—no mouse required.
            </p>
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            className={`bg-amber-100 dark:bg-gray-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Rich Templates</h3>
            <p>
              Start with professionally designed templates for various use cases - from meeting notes to project documentation. 
              Save time and maintain consistency across your documents.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-gray-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
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

const sectionStyle = `mt-4 sm:mt-8 md:mt-32 my-16`;
const gridStyle = `flex flex-col md:flex-row gap-4`;
const gridItemStyle = `w-full sm:w-1/3 py-8 md:py-16 px-8 md:px-8 bg-amber-100  rounded-sm`;
const headingStyle = `text-2xl leading-tight text-white-700`;
const paragraphStyle = `mt-4 text-gray-600`;
