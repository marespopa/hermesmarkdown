import React from "react";
import Button from "../../Button";
import { useRouter } from "next/navigation";

export default function MarkdownGuide() {
  const router = useRouter();
  return (
    <section className="py-16 bg-neutral-50 dark:bg-neutral-800">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4 text-neutral-900 dark:text-white">
            30+ Slash Commands Built-In
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto">
            Type <code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded text-amber-800 dark:text-amber-200 font-mono">/</code> anywhere in the editor to open the command palette.
          </p>
        </div>
        
        {/* Command Examples Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <code className="text-amber-700 dark:text-amber-400 font-mono font-semibold">/structure</code>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Optimised prompt structure</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <code className="text-amber-700 dark:text-amber-400 font-mono font-semibold">/agent</code>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Agent setup</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <code className="text-amber-700 dark:text-amber-400 font-mono font-semibold">/security</code>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Security audit checklist</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <code className="text-amber-700 dark:text-amber-400 font-mono font-semibold">/constraints</code>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">MUST/SHOULD/MUST NOT</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <code className="text-amber-700 dark:text-amber-400 font-mono font-semibold">/cot</code>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Chain-of-thought</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <code className="text-amber-700 dark:text-amber-400 font-mono font-semibold">/refactor</code>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Code refactor template</p>
          </div>
        </div>
        
        <div className="flex justify-center mt-10">
          <Button
            variant="hero"
            onClick={() => router.push("/dashboard/editor")}
          >
            Try It Now →
          </Button>
        </div>
      </div>
    </section>
  );
} 
