import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";

export default function LandingPage() {
  const router = useRouter();
  const [content] = useAtom(atom_content);
  const [showLoading, setShowLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    router.prefetch("/editor");
  }, [router]);

  const handleStart = () => {
    setShowLoading(true);
    router.push("/editor");
  };

  const hasContent = content && content.length > 0;

  return (
    <main className="min-h-screen font-mono selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-950">
      <LoadingOverlay isVisible={showLoading} text="Opening editor..." />

      {/* PERSISTENT RESUME NOTIFICATION */}
      {isMounted && hasContent && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-neutral-100 dark:bg-neutral-900 border-b border-black/5 dark:border-white/10">
          <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-wider opacity-70">
              Active draft found in local storage
            </p>
            <button
              onClick={handleStart}
              className="text-[10px] font-bold uppercase tracking-[0.2em] hover:text-blue-500 transition-colors"
            >
              Resume Session →
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 pt-32 pb-20 space-y-20">
        {/* --- HERO SECTION --- */}
        <section className="space-y-8 animate-hero-fade-in">
          <div className="group flex flex-col gap-2">
            <h1 className="text-4xl tracking-tighter">
              <span className="font-bold">hermes</span>
              <span className="font-light opacity-40">markdown</span>
            </h1>
            <div className="h-px w-12 bg-blue-600 transition-[width] duration-500 group-hover:w-20" />
          </div>

          <p className="text-xl md:text-2xl leading-relaxed font-medium tracking-tight max-w-xl">
            A minimalist, local-first Markdown editor designed for deep work.
            <span className="opacity-40">
              {" "}
              No cloud. No tracking. Just the interface between your mind and
              the page.
            </span>
          </p>

          <div className="pt-4">
            <button
              onClick={handleStart}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3 text-xs uppercase tracking-[0.2em] font-bold hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
            >
              Open Editor
            </button>
          </div>
        </section>

        {/* --- TECHNICAL MANIFESTO --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 border-t border-black/10 dark:border-white/10 pt-12">
          <div className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Local-First
            </h2>
            <p className="text-sm leading-relaxed opacity-60">
              Content is stored in your browser's local state. No database lag,
              no server-side storage, and no cloud-sync conflicts.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Content Privacy
            </h2>
            <p className="text-sm leading-relaxed opacity-60">
              Your writing never leaves your machine. We use basic analytics to
              improve the UI, but your actual page content is never tracked.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Local Vaults
            </h2>
            <p className="text-sm leading-relaxed opacity-60">
              Sync directly with your local file system. Open folders as Vaults to manage your Markdown library with full directory support.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Privacy First
            </h2>
            <p className="text-sm leading-relaxed opacity-60">
              No complex databases or cloud storage. Your files stay exactly where they belong—on your machine, under your control.
            </p>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-10 pb-12 border-t border-black/10 dark:border-white/10 flex justify-between items-center">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">
            Hermes Markdown - A minimal Markdown editor and reader.{" "}
          </p>
        </footer>
      </div>
    </main>
  );
}
