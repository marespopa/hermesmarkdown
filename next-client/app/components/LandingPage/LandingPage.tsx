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
              Session Found
            </span>
            <p className="text-sm leading-tight tracking-tight font-mono">
              You have an active draft in local storage. Resume your work?
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={handleConfirm}>
              Resume
            </Button>
            <Button variant="outlined" onClick={() => setShowDialog(false)}>
              Discard
            </Button>
          </div>
        </div>
      </DialogModal>
      <div className="max-w-2xl mx-auto px-6 py-32 space-y-32">
        {/* --- HERO SECTION --- */}
        <section className="space-y-8">
          <h1 className="text-2xl font-normal tracking-tighter italic">
            Hermes Markdown
          </h1>
          <p className="text-xl leading-relaxed">
            A minimalist, local-first Markdown editor designed for deep work. No
            cloud. No tracking. Just the interface between your mind and the
            page.
          </p>
          <div className="pt-4">
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
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black/10 dark:border-white/10 pt-12">
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
          <div className="bg-white dark:bg-neutral-900 p-8 border border-black/5 dark:border-white/5 font-mono text-sm leading-8 opacity-80">
            # Heading One <br />
            ## Heading Two <br />
            - List Item <br />
            **Bold Text** <br />
            _Italic Text_ <br />
            [Link](https://hermesmarkdown.com)
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
