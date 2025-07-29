"use client";

import Script from "next/script";
import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import CookieConsent from "./CookieConsent";
import CustomProviders from "./CustomProviders";
import Footer from "./Footer/Footer.component";
import Header from "./Header";
import Seo from "./Seo";
import { usePathname } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const MainPage = ({ children }: Props) => {
  const pathname = usePathname();
  const showHeader = !pathname.includes("dashboard");

  return (
    <html lang="en" suppressHydrationWarning className="bg-white dark:bg-neutral-900">
      <Seo />
      <body className="h-full min-h-screen bg-white dark:bg-neutral-900">
        <CustomProviders>
          <main className="h-full min-h-screen flex flex-col">
            <Toaster 
              position="top-center" 
              reverseOrder={false} 
              toastOptions={{
                className: "hermes-toast"
              }}
            />
            <div className={`min-h-screen h-full flex flex-col bg-white dark:bg-neutral-900 text-black dark:text-white flex-1 ${showHeader ? 'pt-4' : ''}`}>
              {showHeader && <Header />}
              <div className="flex-1 h-full flex flex-col">{children}</div>
              <Footer />
            </div>
            <CookieConsent />
            <Script
              defer
              async
              data-host="hermesmarkdown.com"
              src="https://liteanalytics.com/lite.js"
            ></Script>
            <Script
              async
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3137348299560712"
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
            {/* Automatic AdSense Placement */}
            <Script
              id="adsense-auto"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (adsbygoogle = window.adsbygoogle || []).push({
                    google_ad_client: "ca-pub-3137348299560712",
                    enable_page_level_ads: true
                  });
                `,
              }}
            />
          </main>
        </CustomProviders>
      </body>
    </html>
  );
};

export default MainPage;
