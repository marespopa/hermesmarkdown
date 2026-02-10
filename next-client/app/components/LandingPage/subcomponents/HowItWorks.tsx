"use client";

import { useRouter } from "next/navigation";
import Button from "../../Button";
import React, { Suspense, lazy } from "react";

// Lazy load the demo editor
const DemoEditor = lazy(() => import("./DemoEditor"));

// Loading skeleton for the editor
function EditorSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-pulse">
      <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
        <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
        <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
        <div className="ml-2 h-4 w-32 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
      </div>
      <div className="h-[400px] p-4 space-y-3">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
      </div>
      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-40"></div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const router = useRouter();

  return (
    <section className="py-16 bg-white dark:bg-neutral-900">
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
              for templates.
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
