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

export default function PrivacyPolicy() {
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
              Privacy{" "}
              <span className="text-neutral-400 dark:text-neutral-600 italic font-serif">
                Policy.
              </span>
            </h1>
          </div>

          <p className="text-lg md:text-2xl leading-relaxed text-neutral-500 dark:text-neutral-400 max-w-3xl font-medium">
            At HermesMarkdown, we believe that your thoughts should remain private. Our commitment to a local-first architecture is the foundation of our privacy model.
          </p>
        </section>

        {/* --- CONTENT SECTION --- */}
        <section className="prose prose-sm md:prose-base dark:prose-invert max-w-none border-t border-black/5 dark:border-white/10 pt-24 space-y-12">
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Introduction</h2>
            <p className="text-lg">
              This Privacy Policy describes how HermesMarkdown ("we," "us," or "our") handles your information. Unlike traditional SaaS tools, HermesMarkdown is built as a <strong>local-first</strong> application. This means your data primarily lives on your device, not on our servers.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Data Collection & Storage</h2>
            <h3 className="text-ui-title-3 font-semibold">User Content (Markdown Files)</h3>
            <p>
              HermesMarkdown does not store, transmit, or have access to your Markdown files, notes, or vaults. When you open a local folder as a Vault, the application interacts with your file system directly through your browser&apos;s File System Access API. Your content never leaves your machine.
            </p>
            
            <h3 className="text-ui-title-3 font-semibold">Local Storage</h3>
            <p>
              We use <code>localStorage</code> and <code>IndexedDB</code> within your browser to store application settings (like theme, font size, and sidebar width) and to maintain the list of Vault handles you have authorized. This data is local to your browser and is not synchronized with any external database.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Third-Party Services</h2>
            <p>
              To help us understand how users interact with our marketing site and to improve the product, we use a minimal, privacy-focused analytics provider:
            </p>
            <ul>
              <li>
                <strong>LiteAnalytics</strong>: We use LiteAnalytics to track basic page views and referrers. LiteAnalytics is designed to be privacy-friendly; it does not use cookies, does not track unique users across sessions, and does not collect personally identifiable information (PII).
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Your Rights</h2>
            <p>
              Since we do not collect or store your personal data or content, there is no data for us to "export" or "delete" upon request. You have full control over your data because you own the physical files on your device.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
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
