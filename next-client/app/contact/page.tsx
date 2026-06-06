"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Minimalist Grid Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-gradient-radial from-blue-500/[0.05] dark:from-blue-500/[0.03] via-transparent to-transparent blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
    
    {/* Focus Lines (Vertical accents) */}
    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-neutral-200 dark:via-neutral-800 to-transparent opacity-20" />
  </div>
);

export default function ContactPage() {
  const router = useRouter();
  const email = "office@marespopa.com";

  return (
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-[#050505] overflow-x-hidden font-sans relative">
      <BackgroundGraphics />
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-32 space-y-32">
        {/* --- HEADER SECTION --- */}
        <section className="space-y-8 animate-hero-fade-in">
          <Button
            variant="tertiary"
            onClick={() => router.back()}
            className="!text-ui-footnote uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
          >
            ← Back
          </Button>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.05]">
              Get in{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                Touch.
              </span>
            </h1>
          </div>

          <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
            HermesMarkdown is built in the open for writers who value privacy.
            Whether you've found a bug, have a feature request, or just want to
            talk shop about local-first tools—we're listening.
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
        <section className="border-t border-black/5 dark:border-white/10 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4 hover:shadow-lg transition-all group">
              <div className="h-px w-8 bg-blue-600 group-hover:w-12 transition-all duration-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">
                Electronic Mail
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                For formal inquiries, partnership discussions, or if you just want
                to send a private thank you. I check this daily and reply to
                everyone.
              </p>
            </div>

            <div className="p-8 bg-neutral-50/50 dark:bg-neutral-900/30 backdrop-blur-sm rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4 hover:shadow-lg transition-all group">
              <div className="h-px w-8 bg-purple-600 group-hover:w-12 transition-all duration-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">
                GitHub Community
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                HermesMarkdown is open source. If you&apos;ve encountered a
                technical issue or have a code contribution, the best place is our
                public repository.
              </p>
            </div>
          </div>
        </section>

        {/* --- FOOTER SIGNAL --- */}
        <footer className="text-center pt-12 opacity-20">
          <p className="text-ui-footnote uppercase tracking-[0.4em] font-bold">
            Stay Private — Write Deep
          </p>
        </footer>
      </div>
    </main>
  );
}
