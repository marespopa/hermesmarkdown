"use client";

import dynamic from "next/dynamic";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import CustomProviders from "./CustomProviders";
import Footer from "./Footer/Footer.component";
import Header from "./Header";
import { usePathname } from "next/navigation";
import CommandPalette from "./CommandPalette/CommandPalette";
import { CommandPaletteProvider } from "./CommandPalette/CommandPaletteContext";
import AppCommands from "./CommandPalette/AppCommands";
import KeyboardShortcutsOverlay from "./KeyboardShortcutsOverlay/KeyboardShortcutsOverlay";
import SettingsCommands from "../editor/settings/components/SettingsCommands";

const GlobalDialog = dynamic(() => import("./DialogModal/GlobalDialog"));

type Props = {
  children: React.ReactNode;
};

const MainPage = ({ children }: Props) => {
  const pathname = usePathname();
  const isEditor = pathname?.startsWith("/editor");
  const hideNav = isEditor;
  
  const showHeader = !hideNav;
  const showFooter = !isEditor;

  return (
    <CustomProviders>
      <CommandPaletteProvider>
      <AppCommands />
      <SettingsCommands />
      <CommandPalette />
      <KeyboardShortcutsOverlay />
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          className: "hermes-markdown-toast",
          duration: 3000,
          style: {
            fontFamily: "var(--font-inter), Inter, ui-sans-serif, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            background: "var(--surface-raised)",
            color: "var(--fg)",
            boxShadow: "0 8px 24px rgb(0 0 0 / 12%)",
          },
          success: {
            iconTheme: {
              primary: "var(--moss)",
              secondary: "var(--surface-raised)",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--clay)",
              secondary: "var(--surface-raised)",
            },
          },
        }}
      />
      <div className={`flex flex-col h-full bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark ${hideNav ? "overflow-hidden" : "min-h-screen"}`}>
        {showHeader && <Header />}
        
        <main className={`flex-1 flex flex-col ${hideNav ? "overflow-hidden" : ""}`}>
          {children}
        </main>
        
        {showFooter && <Footer />}
        <GlobalDialog />
      </div>
      {process.env.NODE_ENV === "production" && (
        <Script
          defer
          async
          data-host="hermesmarkdown.com"
          src="https://liteanalytics.com/lite.js"
        ></Script>
      )}
      </CommandPaletteProvider>
    </CustomProviders>
  );
};

export default MainPage;
