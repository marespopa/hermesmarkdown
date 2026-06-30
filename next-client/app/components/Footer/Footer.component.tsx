"use client";

import Link from "next/link";
import ProductHuntBadge from "./components/ProductHuntBadge";
import ClientOnly from "../ClientOnly";
import packageJson from "@/package.json";

export default function Footer() {
  return (
    <ClientOnly>
      <footer
        data-testid="GlobalFooter"
        className="pt-24 pb-12 bg-neutral-900 dark:bg-neutral-950 text-ink-dark border-t border-white/5 font-sans selection:bg-sage/40 selection:text-white"
      >
        <div className="container max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between w-full items-start gap-12 md:gap-8">
            <div className="flex flex-col gap-6 max-w-sm">
              <div className="space-y-2">
                <span className="text-ui-title-2 font-bold tracking-tight">HermesMarkdown</span>
                <p className="text-ui-subhead text-neutral-400 leading-relaxed">
                  A premium, local-first workspace for focused writing and deep work. No cloud, no tracking, total privacy.
                </p>
              </div>
              <div className="text-ui-footnote uppercase tracking-[0.2em] font-bold opacity-50">
                Made with <span className="text-red-500">🧡</span> by{" "}
                <a
                  className="hover:opacity-100 transition-opacity underline underline-offset-4"
                  href="https://www.marespopa.com/"
                  target="_blank"
                >
                  Mares Popa
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 md:gap-24">
               <div className="flex flex-col gap-4">
                  <h3 className="text-ui-footnote uppercase tracking-[0.3em] font-bold opacity-50">Product</h3>
                  <ul className="flex flex-col gap-2 text-ui-subhead font-medium">
                    <li><Link href="/" className="hover:text-sage transition-colors">Editor</Link></li>
                    <li><Link href="/documentation" className="hover:text-sage transition-colors">Documentation</Link></li>
                    <li><Link href="/what-is-hermes-md" className="hover:text-sage transition-colors">What is hermes.md?</Link></li>
                  </ul>
               </div>

               <div className="flex flex-col gap-4">
                  <h3 className="text-ui-footnote uppercase tracking-[0.3em] font-bold opacity-50">Legal</h3>
                  <ul className="flex flex-col gap-2 text-ui-subhead font-medium">
                    <li><Link href="/privacy-policy" className="hover:text-sage transition-colors">Privacy</Link></li>
                    <li><Link href="/terms" className="hover:text-sage transition-colors">Terms</Link></li>
                  </ul>
               </div>

               <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
                  <h3 className="text-ui-footnote uppercase tracking-[0.3em] font-bold opacity-50">Social</h3>
                  <div className="flex flex-col gap-4">
                    <ProductHuntBadge />
                    <Link href="/contact" className="text-ui-subhead font-medium hover:text-sage transition-colors">Contact Us</Link>
                    <a
                      href="https://github.com/marespopa/hermesmarkdown"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ui-subhead font-medium hover:text-sage transition-colors"
                    >
                      Source Code
                    </a>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 opacity-50 text-ui-footnote uppercase tracking-[0.2em] font-bold">
             <span>© {new Date().getFullYear()} HermesMarkdown. All rights reserved.</span>
             <span className="text-ui-caption tracking-[0.1em]">v{packageJson.version}</span>
          </div>
        </div>
      </footer>
    </ClientOnly>
  );
}
