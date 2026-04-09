import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import DialogModal from "@/app/components/DialogModal/DialogModal";

export default function LandingPage() {
  const router = useRouter();
  const [content] = useAtom(atom_content);
  const [showLoading, setShowLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const fullText =
    "A minimalist, local-first Markdown editor designed for deep work. No cloud. No tracking. Just the interface between your mind and the page.";
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const intervalId = setInterval(() => {
      setDisplayText(fullText.slice(0, index));
      index++;

      if (index > fullText.length) {
        clearInterval(intervalId);
        setIsComplete(true);
      }
    }, 35);

    return () => clearInterval(intervalId);
  }, []);
  const hasContent = content.length > 0;

  useEffect(() => {
    router.prefetch("/editor");
  }, [router]);

  useEffect(() => {
    if (hasContent) {
      setShowDialog(true);
    }
  }, [hasContent]);

  const handleConfirm = () => {
    setShowDialog(false);
    setShowLoading(true);

    router.push("/editor");
  };

  return (
    <main className="min-h-screen font-mono selection:bg-blue-500 dark:selection:bg-blue-100">
      <LoadingOverlay isVisible={showLoading} text="Loading the editor..." />
      <DialogModal
        isOpened={showDialog}
        onClose={() => setShowDialog(false)}
        style="max-h-[200px]"
      >
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] block">
              Active Session
            </span>
            <p className="text-sm leading-tight tracking-tight font-mono">
              An existing editor session was found. Would you like to jump back
              in?
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={handleConfirm}>
              Resume Session
            </Button>
            <Button variant="outlined" onClick={() => setShowDialog(false)}>
              Not Now
            </Button>
          </div>
        </div>
      </DialogModal>
      <div className="max-w-2xl mx-auto px-6 py-32 space-y-32">
        {/* --- HERO SECTION --- */}
        <section className="space-y-8">
          <div className="group flex flex-col gap-2">
            <h1 className="text-4xl tracking-tighter text-black dark:text-white">
              <span className="font-bold">hermes</span>
              <span className="font-extralight opacity-60">markdown</span>
            </h1>
            <div className="h-[1px] w-16 bg-black/10 dark:bg-white/10 transition-w duration-500 group-hover:w-24" />
          </div>

          {/* Typewriter Paragraph */}
          <p
            className={`text-xl leading-relaxed min-h-[100px] ${!isComplete ? "typewriter-cursor" : ""}`}
          >
            {displayText}
          </p>

          {/* Button with Fade-in Effect */}
          <div
            className={`pt-4 transition-opacity duration-1000 ${isComplete ? "opacity-100" : "opacity-0"}`}
          >
            <button
              onClick={() => router.push("/editor")}
              className="group flex items-center gap-3 text-sm uppercase tracking-[0.3em] font-bold"
            >
              Start Writing
              <span className="group-hover:translate-x-2 transition-transform">
                →
              </span>
            </button>
          </div>
        </section>

        {/* --- PHILOSOPHY SECTION --- */}
        <section
          className={`grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black/10 dark:border-white/10 pt-12 ${isComplete ? "opacity-100" : "opacity-0"}`}
        >
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">
              01. Privacy
            </h2>
            <p className="text-sm leading-relaxed">
              Your data never leaves your machine. Hermes operates entirely
              within your browser's local storage.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">
              02. Speed
            </h2>
            <p className="text-sm leading-relaxed">
              Instant-on performance. No accounts to create, no servers to wait
              for.
            </p>
          </div>
        </section>

        {/* --- GUIDE SECTION --- */}
        <section className="space-y-6">
          <h2 className="text-xs uppercase tracking-[0.2em] opacity-50 text-center">
            Standard Syntax
          </h2>
          <div className="bg-white dark:bg-neutral-900 p-8 border border-black/5 dark:border-white/5 font-mono text-sm leading-relaxed opacity-80">
            <div className="grid grid-cols-1 gap-3">
              <p>
                <span className="opacity-40">#</span> **Heading One**
              </p>
              <p>
                <span className="opacity-40">##</span> **Heading Two**
              </p>
              <p>
                <span className="opacity-40">-</span> List Item
              </p>
              <p>
                <span className="opacity-40">**</span>**Bold Text**
                <span className="opacity-40">**</span>
              </p>
              <p>
                <span className="opacity-40">_</span>_Italic Text_
                <span className="opacity-40">_</span>
              </p>
              <p>
                <span className="opacity-40">[</span>Link
                <span className="opacity-40">]</span>
                <span className="opacity-40">(</span>https://...
                <span className="opacity-40">)</span>
              </p>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="pt-20 pb-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] opacity-30">
            Privacy First — Markdown Only
          </p>
        </footer>
      </div>
    </main>
  );
}
