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
  const showHeader = !["/editor/settings", "/editor"].some(
    (route) => pathname === route,
  );
  const showFooter = !["/editor", "/editor/settings"].some(
    (route) => pathname === route,
  );

  return (
    <CustomProviders>
      <main className="h-full min-h-screen flex flex-col">
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            className: "hermes-toast",
          }}
        />
        <div
          className={`min-h-screen h-full flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white flex-1 ${showHeader ? "pt-4" : ""}`}
        >
          {showHeader && <Header />}
          <div className="flex-1 h-full flex flex-col">{children}</div>
          {showFooter && <Footer />}
        </div>
        <CookieConsent />
        <GlobalDialog />
        <Script
          defer
          async
          data-host="hermesmarkdown.com"
          src="https://liteanalytics.com/lite.js"
        ></Script>
      </main>
    </CustomProviders>
  );
};

export default MainPage;
