"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();
  const email = "office@marespopa.com";

  return (
    <main className="min-h-screen font-mono selection:bg-blue-500 dark:selection:bg-blue-100 bg-white dark:bg-neutral-900 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-32 space-y-32">
        {/* --- HEADER SECTION --- */}
        <section className="space-y-8">
          <button
            onClick={() => router.back()}
            className="text-[10px] uppercase tracking-[0.3em] opacity-50 hover:opacity-100 transition-opacity"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-normal tracking-tighter italic">
            Get in touch
          </h1>

          <p className="text-xl leading-relaxed">
            Hermes is my personal project, built in the open. If you encounter a
            bug, have a feature request, or simply want to discuss the future of
            minimalist writing tools, I am listening.
          </p>

          <div className="pt-4">
            <a
              href={`mailto:${email}`}
              className="group flex items-center gap-3 text-sm uppercase tracking-[0.3em] font-bold"
            >
              {email}
              <span className="group-hover:translate-x-2 transition-transform">
                →
              </span>
            </a>
          </div>
        </section>

        {/* --- CHANNELS SECTION --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black/10 dark:border-white/10 pt-12">
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">
              01. Electronic Mail
            </h2>
            <p className="text-sm leading-relaxed">
              For formal inquiries, bug reports, or partnership discussions. I
              check this daily.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] opacity-50">
              02. Open Source
            </h2>
            <p className="text-sm leading-relaxed">
              If you found a technical issue, feel free to open a ticket or
              contribute to the codebase.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
