export default function Features() {
  return (
    <section className="py-16 bg-white dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 text-center prose prose-neutral dark:prose-invert">
        <h2 className="text-3xl font-semibold mb-8">
          Why Choose HermesMarkdown?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Prompt Crafting</h3>
            <p>
              Use specialized templates for System Roles and Few-Shot examples to build high-performance AI instructions.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Clean Copy</h3>
            <p>
              When you're writing prompts, you don't want to paste your tags and titles into the AI. Use the 'Copy Prompt' button to grab only the text you need, automatically skipping the frontmatter.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Clean Export</h3>
            <p>
              Copy your content instantly without metadata, or export to professional PDF with one click.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Total Privacy</h3>
            <p>
              Your workspace is offline-ready. HermesMarkdown stores everything locally, ensuring your proprietary logic remains 100% private.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
