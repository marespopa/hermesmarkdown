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
const TemplateDialogHost = dynamic(() => import("./TemplateDialog/TemplateDialogHost"));

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
          className: "hermes-markdown-toast glass-panel",
          duration: 3000,
          style: {
            fontFamily: "var(--font-plus-jakarta), ui-sans-serif, sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            borderRadius: "12px",
            // The panel material (`.glass-panel`) owns fill, blur, edge
            // and shadow; react-hot-toast's own defaults would cover it.
            background: "var(--material-panel)",
            boxShadow: "inset 0 1px 0 var(--material-highlight), var(--material-shadow)",
            color: "var(--fg)",
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
      {/* Only the editor is pinned to the viewport. Elsewhere the shell grows
          with the page: a fixed `h-full` capped it at one screen, so the
          sticky header was pushed off the top once you scrolled past it. */}
      <div className={`flex flex-col bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark ${hideNav ? "h-full overflow-hidden" : "min-h-screen"}`}>
        {showHeader && <Header />}
        
        <main className={`flex-1 flex flex-col ${hideNav ? "overflow-hidden" : ""}`}>
          {children}
        </main>
        
        {showFooter && <Footer />}
        <GlobalDialog />
        <TemplateDialogHost />
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
