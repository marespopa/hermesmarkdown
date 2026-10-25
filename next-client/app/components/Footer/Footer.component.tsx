"use client";

import ProductHuntBadge from "./components/ProductHuntBadge";
import ToolsCafeBadge from "./components/ToolsCafeBadge";
import ClientOnly from "../ClientOnly";
import packageJson from "@/package.json";
import { TOOLS, toolPath } from "@/app/tools/content/tools";
import TextLink from "@/app/components/TextLink";

export default function Footer() {
  return (
    <ClientOnly>
      <footer
        data-testid="GlobalFooter"
        className="pt-16 md:pt-24 pb-10 md:pb-12 bg-neutral-900 dark:bg-neutral-950 text-ink-dark border-t border-white/5 font-sans selection:bg-sage/40 selection:text-white"
      >
        <div className="container max-w-screen-xl">
          <div className="flex flex-col md:flex-row justify-between w-full items-start gap-12 md:gap-8">
            <div className="flex flex-col gap-6 max-w-sm">
              <div className="space-y-2">
                <span className="text-ui-title-2 font-bold tracking-tight">HermesMarkdown</span>
                <p className="text-ui-subhead text-neutral-400 leading-relaxed">
                  A local-first workspace for focused writing and deep work. No cloud, no tracking, total privacy.
                </p>
              </div>
              <div className="text-ui-footnote uppercase tracking-[0.2em] font-bold text-neutral-400">
                Made with <span className="text-red-500">🧡</span> by{" "}
                <TextLink
                  href="https://www.marespopa.com/"
                  variant="quiet"
                  className="underline underline-offset-4"
                >
                  Mares Popa
                </TextLink>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 md:gap-24">
               <div className="flex flex-col gap-4">
                  <h3 className="text-ui-footnote uppercase tracking-[0.3em] font-bold text-neutral-400">Product</h3>
                  <ul className="flex flex-col gap-2 text-ui-subhead font-medium">
                    <li><TextLink href="/" variant="quiet">Editor</TextLink></li>
                    <li><TextLink href="/documentation" variant="quiet">Documentation</TextLink></li>
                    <li><TextLink href="/markdown-editor" variant="quiet">What Is a Markdown Editor?</TextLink></li>
                    <li><TextLink href="/what-is-hermes-md" variant="quiet">HermesMarkdown vs Hermes Agent</TextLink></li>
                    <li><TextLink href="/tools" variant="quiet">Free Tools</TextLink></li>
                    {TOOLS.map((tool) => (
                      <li key={tool.slug}><TextLink href={toolPath(tool)} variant="quiet">{tool.name}</TextLink></li>
                    ))}
                    <li>
                      <TextLink
                        href="https://github.com/marespopa/hermesmarkdown/issues"
                        variant="quiet"
                      >
                        Issues
                      </TextLink>
                    </li>
                  </ul>
               </div>

               <div className="flex flex-col gap-4">
                  <h3 className="text-ui-footnote uppercase tracking-[0.3em] font-bold text-neutral-400">Legal</h3>
                  <ul className="flex flex-col gap-2 text-ui-subhead font-medium">
                    <li><TextLink href="/privacy-policy" variant="quiet">Privacy</TextLink></li>
                    <li><TextLink href="/terms" variant="quiet">Terms</TextLink></li>
                  </ul>
               </div>

               <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
                  <h3 className="text-ui-footnote uppercase tracking-[0.3em] font-bold text-neutral-400">Social</h3>
                  <div className="flex flex-col gap-4">
                    <ProductHuntBadge />
                    <ToolsCafeBadge />
                    <TextLink href="/contact" variant="quiet" className="text-ui-subhead font-medium">Contact Us</TextLink>
                    <TextLink
                      href="https://github.com/marespopa/hermesmarkdown"
                      variant="quiet" className="text-ui-subhead font-medium"
                    >
                      Source Code
                    </TextLink>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-row flex-wrap justify-between items-baseline gap-x-6 gap-y-2">
             <span className="text-ui-footnote uppercase tracking-[0.2em] font-bold text-neutral-400">© {new Date().getFullYear()} HermesMarkdown. All rights reserved.</span>
             <span className="text-ui-caption uppercase tracking-[0.15em] font-bold text-neutral-400 shrink-0">v{packageJson.version}</span>
          </div>
        </div>
      </footer>
    </ClientOnly>
  );
}
