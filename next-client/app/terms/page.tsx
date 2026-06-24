"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

export default function TermsAndConditions() {
  const router = useRouter();

  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans relative">
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
              Terms of{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                Service.
              </span>
            </h1>
          </div>

          <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
            Transparency and accountability are core to the HermesMarkdown philosophy. These terms outline our mutual commitment to a fair and open workspace.
          </p>
        </section>

        {/* --- CONTENT SECTION --- */}
        <section className="prose prose-sm md:prose-base dark:prose-invert max-w-none border-t border-black/5 dark:border-white/10 pt-24 space-y-12">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Acceptance of Terms</h2>
            <p className="text-lg">
              By accessing and using www.hermesmarkdown.com and the HermesMarkdown Service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">1. The Service</h2>
            <h3 className="text-ui-title-3 font-semibold">1.1 Service Description</h3>
            <p>
              HermesMarkdown is a local-first Markdown editor tool designed to facilitate transparent and efficient writing. The &quot;Service&quot; includes all functionalities, APIs, and tools offered through our platform.
            </p>
            
            <h3 className="text-ui-title-3 font-semibold">1.2 Modifications</h3>
            <p>
              We reserve the right to modify or discontinue any feature of the Service at any time. Significant changes to core functionality will be announced on our Site or through the Service.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">2. User Responsibility</h2>
            <p>
              You are responsible for your use of the Service and for any content you create. Because HermesMarkdown is a local-first application, you are solely responsible for the backup and security of your Markdown files stored on your local device.
            </p>
            <p>
              You must be at least 16 years old to use the Service. We reserve the right to request proof of age to ensure compliance.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">3. Liability & Disclaimers</h2>
            <p>
              HERMESMARKDOWN AND ITS CREATOR, MARES POPA, BEAR NO RESPONSIBILITY FOR DATA LOSS, SECURITY BREACHES ON YOUR LOCAL DEVICE, OR THE OPERABILITY OF THIRD-PARTY SERVICES. THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.
            </p>
          </div>

          <div className="pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-ui-footnote uppercase tracking-widest font-bold opacity-30">
            <span>Last Updated: May 30, 2026</span>
            <a href="mailto:office@marespopa.com" className="hover:opacity-100 transition-opacity">Contact: office@marespopa.com</a>
          </div>
        </section>
      </div>
    </main>
  );
}
