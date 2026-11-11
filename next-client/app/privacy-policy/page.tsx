"use client";

import React from "react";
import Link from "next/link";
import PageHero from "@/app/components/PageHero/PageHero";
import TextLink from "@/app/components/TextLink";

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

export default function PrivacyPolicy() {

  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans relative">
      <BackgroundGraphics />
      <div className="container max-w-screen-xl pt-32 pb-32 space-y-32">
        <PageHero
          showBack
          title="Privacy"
          accent="Policy."
          intro="At HermesMarkdown, we believe that your thoughts should remain private. Our commitment to a local-first architecture is the foundation of our privacy model."
        />

        {/* --- CONTENT SECTION --- */}
        <section className="prose prose-sm md:prose-base dark:prose-invert max-w-3xl border-t border-black/5 dark:border-white/10 pt-24 space-y-12">
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
              HermesMarkdown does not store, transmit, or have access to your Markdown files, notes, or vaults. When you open a local folder as a Vault, the application interacts with your file system directly through your browser&apos;s File System Access API. Your content never leaves your machine, except for text you send to an AI provider (see AI Features below).
            </p>
            
            <h3 className="text-ui-title-3 font-semibold">AI Features (Optional)</h3>
            <p>
              AI is off until you add your own API key. The key is kept in your browser. When you use an AI feature, the text you send and your key pass through the HermesMarkdown server, which forwards them to the provider you chose (Anthropic, Google or another) for that one request. HermesMarkdown does not store the text, the reply or the key. A local Ollama model is called straight from your browser, with no request to our server. The provider handles your text under its own terms.
            </p>

            <h3 className="text-ui-title-3 font-semibold">Local Storage</h3>
            <p>
              We use <code>localStorage</code> and <code>IndexedDB</code> within your browser to store application settings (like theme, font, and editor preferences) and to maintain the list of Vault handles you have authorized. This data is local to your browser and is not synchronized with any external database.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Third-Party Services</h2>
            <p>
              To help us understand how users interact with our marketing site and to improve the product, we use a minimal, privacy-focused analytics provider:
            </p>
            <ul>
              <li>
                <strong>LiteAnalytics</strong>: We use LiteAnalytics to count basic page views and referrers. We send only the page&apos;s path (for example, <code>/editor</code>) and the referring site&apos;s address, never the query string, so the names of your notes, folders and tags are never sent. LiteAnalytics is designed to be privacy-friendly; it does not use cookies, does not track unique users across sessions, and does not collect personally identifiable information (PII).
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-sage dark:text-sage text-xs">Cookies</h2>
            <p>
              HermesMarkdown does not use cookies. Our analytics provider, LiteAnalytics, is cookieless by design, and we do not set any cookies of our own for tracking, advertising, or session management on the marketing site.
            </p>
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
            <TextLink href="mailto:office@marespopa.com" variant="quiet">Contact: office@marespopa.com</TextLink>
          </div>
        </section>

        <nav aria-label="Related pages" className="border-t border-black/5 dark:border-white/10 pt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Related pages</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            <Link href="/terms" className="underline underline-offset-4 hover:text-fg">Terms of Service</Link>
            <Link href="/contact" className="underline underline-offset-4 hover:text-fg">Contact</Link>
          </div>
        </nav>
      </div>
    </main>
  );
}
