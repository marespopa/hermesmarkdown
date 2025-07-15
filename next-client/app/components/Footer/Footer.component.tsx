"use client";

import Link from "next/link";
import ProductHuntBadge from "./components/ProductHuntBadge";
import { usePathname } from "next/navigation";
import ClientOnly from "../ClientOnly";

export default function Footer() {
  const pathname = usePathname();

  if (pathname.includes("editor")) {
    return <></>;
  }

  return (
    <ClientOnly>
      <footer
        data-testid="GlobalFooter"
        className="py-4 bg-neutral-900 dark:bg-black text-white font-bold text-xs"
      >
        <div className="container max-w-screen-xl mx-auto px-4 md:px-2">
          <div className="flex flex-col md:flex-row justify-between w-full items-center">
            <div className="flex flex-col gap-4">
              <span className="text-xl text-black dark:text-white">Markdown with ease</span>
              <span>
                Made with <span style={{ color: "#e25555" }}>&#9829;</span> by{" "}
                <a
                  className="underline"
                  href="https://www.marespopa.com/"
                  target="_blank"
                >
                  Mares Popa
                </a>
                .
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <ProductHuntBadge />
              <div className="flex gap-4">
                <Link
                  href="/privacy-policy"
                  className="hover:text-neutral-100 transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-neutral-100 transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </ClientOnly>
  );
}
