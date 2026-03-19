"use client";

import { useRouter } from "next/navigation";
import Button from "../../Button";
import { Suspense, lazy } from "react";
import EditorSkeleton from "../../EditorSkeleton";

// Lazy load the demo editor
const DemoEditor = lazy(() => import("./DemoEditor"));

export default function HowItWorks() {
  const router = useRouter();

  return (
    <section id="how-it-works" className="mt-16 py-16 bg-neutral-50 dark:bg-neutral-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4 text-neutral-900 dark:text-white">
            Try It Right Here
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            This is the actual editor. Start typing to see how it works.
          </p>
        </div>

        {/* Embedded Demo Editor */}
        <div className="max-w-4xl mx-auto mb-12">
          <Suspense fallback={<EditorSkeleton />}>
            <DemoEditor />
          </Suspense>
        </div>

        {/* 3-Step Process */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                1
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1 text-neutral-900 dark:text-white">
              Write
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Draft with markdown. Use{" "}
              <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-xs">
                /
              </code>{" "}
              for templates. Cursor lands at the start of each snippet — fill in from the top.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                2
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1 text-neutral-900 dark:text-white">
              Refine
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Check word count and token estimates as you type.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                3
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1 text-neutral-900 dark:text-white">
              Copy
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Copy your prompt and paste it into any AI chatbot.
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            variant="hero"
            onClick={() => router.push("/dashboard/editor")}
          >
            Open Full Editor →
          </Button>
        </div>
      </div>
    </section>
  );
}
