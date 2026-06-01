"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

export default function TermsAndConditions() {
  const router = useRouter();

  return (
    <main className="min-h-screen selection:bg-blue-500/30 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 overflow-x-hidden font-sans">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-32 space-y-16">
        {/* --- HEADER SECTION --- */}
        <section className="space-y-8 animate-hero-fade-in flex flex-col items-start">
          <Button
            variant="tertiary"
            onClick={() => router.back()}
            className="!text-[10px] uppercase tracking-[0.3em] opacity-40 hover:opacity-100 -ml-4"
          >
            ← Back
          </Button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            Terms of{" "}
            <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
              Service.
            </span>
          </h1>

          <p className="text-lg leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-2xl">
            Transparency and accountability are core to the HermesMarkdown philosophy. These terms outline our mutual commitment to a fair and open workspace.
          </p>
        </section>

        {/* --- CONTENT SECTION --- */}
        <section className="prose prose-sm md:prose-base dark:prose-invert max-w-none border-t border-black/5 dark:border-white/10 pt-16 space-y-12">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Acceptance of Terms</h2>
            <p>
              By accessing and using www.hermesmarkdown.com and the HermesMarkdown Service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">1. The Service</h2>
            <h3 className="text-lg font-semibold">1.1 Service Description</h3>
            <p>
              HermesMarkdown is a local-first Markdown editor tool designed to facilitate transparent and efficient writing. The &quot;Service&quot; includes all functionalities, APIs, and tools offered through our platform.
            </p>
            
            <h3 className="text-lg font-semibold">1.2 Modifications</h3>
            <p>
              We reserve the right to modify or discontinue any feature of the Service at any time. Significant changes to core functionality will be announced on our Site or through the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">2. User Responsibility</h2>
            <p>
              You are responsible for your use of the Service and for any content you create. Because HermesMarkdown is a local-first application, you are solely responsible for the backup and security of your Markdown files stored on your local device.
            </p>
            <p>
              You must be at least 16 years old to use the Service. We reserve the right to request proof of age to ensure compliance.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">3. Liability & Disclaimers</h2>
            <p>
              HERMESMARKDOWN AND ITS CREATOR, MARES POPA, BEAR NO RESPONSIBILITY FOR DATA LOSS, SECURITY BREACHES ON YOUR LOCAL DEVICE, OR THE OPERABILITY OF THIRD-PARTY SERVICES. THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
            </p>
          </div>

          <div className="pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest font-bold opacity-30">
            <span>Last Updated: May 30, 2026</span>
            <a href="mailto:office@marespopa.com" className="hover:opacity-100 transition-opacity">Contact: office@marespopa.com</a>
          </div>
        </section>
      </div>
    </main>
  );
}
