"use client";

import dynamic from "next/dynamic";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import CustomProviders from "./CustomProviders";
import Footer from "./Footer/Footer.component";
import Header from "./Header";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { CommandPaletteProvider, useCommandPalette } from "./CommandPalette/CommandPaletteContext";
import AppCommands from "./CommandPalette/AppCommands";
import SettingsCommands from "../editor/settings/components/SettingsCommands";
import useTapRefocus from "../hooks/use-tap-refocus";
import { atom_keyboardShortcutsOpen } from "../atoms/ui-atoms";

const GlobalDialog = dynamic(() => import("./DialogModal/GlobalDialog"));
const TemplateDialogHost = dynamic(() => import("./TemplateDialog/TemplateDialogHost"));

// The palette (CodeMirror, file system, content search) and the shortcuts
// overlay are split out of the shared bundle so marketing pages don't ship
// them. The editor mounts them at once (the palette keeps the content index
// in sync there); elsewhere they mount on first open, and their chunks are
// fetched when the browser goes idle so that first open is still instant.
const importCommandPalette = () => import("./CommandPalette/CommandPalette");
const importShortcutsOverlay = () => import("./KeyboardShortcutsOverlay/KeyboardShortcutsOverlay");
const CommandPalette = dynamic(importCommandPalette, { ssr: false });
const KeyboardShortcutsOverlay = dynamic(importShortcutsOverlay, { ssr: false });

function usePreloadOnIdle() {
  useEffect(() => {
    const preload = () => {
      void importCommandPalette();
      void importShortcutsOverlay();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 2000);
    return () => window.clearTimeout(id);
  }, []);
}

// True from the first time `open` is set, so the closing animation still plays.
function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open);
  useEffect(() => {
    if (open) setOpened(true);
  }, [open]);
  return opened || open;
}

function GlobalOverlays({ eager }: { eager: boolean }) {
  usePreloadOnIdle();
  const { isOpen } = useCommandPalette();
  const shortcutsOpen = useAtomValue(atom_keyboardShortcutsOpen);
  const paletteOpened = useOpenedOnce(isOpen);
  const shortcutsOpened = useOpenedOnce(shortcutsOpen);
  return (
    <>
      {(eager || paletteOpened) && <CommandPalette />}
      {(eager || shortcutsOpened) && <KeyboardShortcutsOverlay />}
    </>
  );
}

type Props = {
  children: React.ReactNode;
};

const MainPage = ({ children }: Props) => {
  const pathname = usePathname();
  useTapRefocus();
  const isEditor = pathname?.startsWith("/editor");
  const hideNav = isEditor;
  
  const showHeader = !hideNav;
  const showFooter = !isEditor;

  return (
    <CustomProviders>
      <CommandPaletteProvider>
      <AppCommands />
      <SettingsCommands />
      <GlobalOverlays eager={!!isEditor} />
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
          // Success takes the theme's accent; an error stays red whatever the
          // theme (the accent may be blue or green), as the save-error dot is.
          error: {
            iconTheme: {
              primary: "#DC2626",
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
