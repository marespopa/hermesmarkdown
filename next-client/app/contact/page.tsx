"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

export default function ContactPage() {
  const router = useRouter();
  const email = "office@marespopa.com";

  return (
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 overflow-x-hidden font-sans">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-32 space-y-24">
        {/* --- HEADER SECTION --- */}
        <section className="space-y-8 animate-hero-fade-in text-center flex flex-col items-center">
          <Button
            variant="tertiary"
            onClick={() => router.back()}
            className="!text-[10px] uppercase tracking-[0.3em] opacity-40 hover:opacity-100"
          >
            ← Back to Previous
          </Button>

          <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            Get in{" "}
            <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
              Touch.
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            HermesMarkdown is built in the open for writers who value privacy. Whether you've found a bug, have a feature request, or just want to talk shop about local-first tools—we're listening.
          </p>

          <div className="pt-8">
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-4 bg-neutral-900 dark:bg-zinc-100 text-white dark:text-neutral-900 px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all font-bold text-sm uppercase tracking-widest group"
            >
              {email}
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </a>
          </div>
        </section>

        {/* --- CHANNELS SECTION --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-black/5 dark:border-white/10">
          <div className="p-8 bg-neutral-50 dark:bg-neutral-900/50 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4 hover:shadow-lg transition-all group">
            <div className="h-px w-8 bg-blue-600 group-hover:w-12 transition-all duration-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">
              Electronic Mail
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              For formal inquiries, partnership discussions, or if you just want to send a private thank you. I check this daily and reply to everyone.
            </p>
          </div>
          
          <div className="p-8 bg-neutral-50 dark:bg-neutral-900/50 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4 hover:shadow-lg transition-all group">
             <div className="h-px w-8 bg-purple-600 group-hover:w-12 transition-all duration-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">
              GitHub Community
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              HermesMarkdown is open source. If you&apos;ve encountered a technical issue or have a code contribution, the best place is our public repository.
            </p>
          </div>
        </section>
        
        {/* --- FOOTER SIGNAL --- */}
        <footer className="text-center pt-12 opacity-20">
           <p className="text-[10px] uppercase tracking-[0.4em] font-bold">Stay Private — Write Deep</p>
        </footer>
      </div>
    </main>
  );
}
