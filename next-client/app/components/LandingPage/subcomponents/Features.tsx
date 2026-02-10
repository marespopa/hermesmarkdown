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
            <h3 className="text-xl font-bold mb-4">Local First</h3>
            <p>
              Your data stays on your hard drive, not in a cloud database. HermesMarkdown operates entirely within your local environment, giving you full control over your intellectual property and preventing unauthorized data leaks.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Slash Commands</h3>
            <p>
              Accelerate your drafting with a Notion-style command palette. Inject structural "contracts," security audits, and refactor patterns instantly using / commands without breaking your flow.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Logic Guard</h3>
            <p>
              Remove the guesswork from prompt performance. Use real-time complexity and reading ease metrics to ensure your instructions are precise enough for modern LLMs to follow without ambiguity.
            </p>
          </div>
          <div
            className={`bg-amber-100 dark:bg-neutral-800 rounded-sm py-8 px-6 hover:scale-105 focus:scale-105`}
          >
            <h3 className="text-xl font-bold mb-4">Clean Copy</h3>
            <p>
              Stop manually editing your prompts before pasting. The 'Copy Prompt' feature automatically strips YAML frontmatter and metadata, giving you a clean, instruction-only block ready for any AI interface.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
