"use client";

import Script from "next/script";
import { Toaster } from "react-hot-toast";
import CookieConsent from "./CookieConsent";
import CustomProviders from "./CustomProviders";
import Footer from "./Footer/Footer.component";
import Header from "./Header";
import { usePathname } from "next/navigation";
import GlobalDialog from "./DialogModal/GlobalDialog";

type Props = {
  children: React.ReactNode;
};

const MainPage = ({ children }: Props) => {
  const pathname = usePathname();
  const isEditor = pathname === "/editor" || pathname === "/editor/settings";
  
  const showHeader = !isEditor;
  const showFooter = !isEditor;

  return (
    <CustomProviders>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: "hermes-markdown-toast",
        }}
      />
      <div className={`flex flex-col h-full paper-grain bg-paper-light dark:bg-paper-dark text-ink-light dark:text-ink-dark ${isEditor ? "overflow-hidden" : "min-h-screen"}`}>
        {showHeader && <Header />}
        
        <main className={`flex-1 flex flex-col ${isEditor ? "overflow-hidden" : ""}`}>
          {children}
        </main>
        
        {showFooter && <Footer />}
        <CookieConsent />
        <GlobalDialog />
      </div>
      <Script
        defer
        async
        data-host="hermesmarkdown.com"
        src="https://liteanalytics.com/lite.js"
      ></Script>
    </CustomProviders>
  );
};

export default MainPage;
