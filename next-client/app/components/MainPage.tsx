"use client";

import Script from "next/script";
import React from "react";
import { Toaster } from "react-hot-toast";
import CookieConsent from "./CookieConsent";
import CustomProviders from "./CustomProviders";
import Footer from "./Footer/Footer.component";
import Header from "./Header";
import { Fira_Code } from "next/font/google";
import { usePathname } from "next/navigation";

import Seo from "./Seo";

const monoFont = Fira_Code({ subsets: ["latin"], weight: "400" });

type Props = {
  children: React.ReactNode;
};

const MainPage = ({ children }: Props) => {
  const pathname = usePathname();
  const showHeader = !pathname.includes("dashboard");

  return (
    <html lang="en" suppressHydrationWarning>
      <Seo />
      <body>
        <CustomProviders>
          <main className={monoFont.className}>
            <Toaster position="top-center" reverseOrder={false} />
            <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 dark:text-white">
              {showHeader && <Header />}
              <div className="flex-1">{children}</div>
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
            ></Script>
          </main>
        </CustomProviders>
      </body>
    </html>
  );
};

export default MainPage;
