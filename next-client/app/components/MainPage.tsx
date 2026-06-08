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
  const isEditor = pathname?.startsWith("/editor");
  const isAuthCallback = pathname === "/auth/google/callback";
  const hideNav = isEditor || isAuthCallback;
  
  const showHeader = !hideNav;
  const showFooter = !hideNav;

  return (
    <CustomProviders>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          className: "hermes-markdown-toast",
        }}
      />
      <div className={`flex flex-col h-full paper-grain bg-paper-light dark:bg-paper-dark text-ink-light dark:text-ink-dark ${hideNav ? "overflow-hidden" : "min-h-screen"}`}>
        {showHeader && <Header />}
        
        <main className={`flex-1 flex flex-col ${hideNav ? "overflow-hidden" : ""}`}>
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
