"use client";

import React, { type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_sidebarOpen } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import PageHelpLink, { type PageHelp } from "./PageHelpLink";
import DocumentationLink from "./DocumentationLink";
import { PANE_HEADER_HEIGHT } from "./pane-header-classes";
import SearchPill from "./SearchPill";
import { editorFileHref } from "../utils/editor-url";

// Room for EditorShell's Show sidebar button while the sidebar is hidden.
const TOGGLE_ROOM = "3.5rem";
const EDGE_ROOM = "1.25rem";

// The frame of every /editor page (Tasks, Templates, Trash, Files,
// Settings), the same plain page as the editor beside the sidebar: a title
// bar level with the sidebar's header, then the page. The bar leads with
// ← Editor (the sidebar is only the library, so this is the way back),
// which returns to the note in front, at its URL. With `help`, a (?) before
// the Documentation link points to the page's section of the documentation.
export default function ShellPage({ title, help, children }: { title: string; help?: PageHelp; children: ReactNode }) {
  const router = useRouter();
  const isMobileChrome = useIsMobileChrome();
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const hasSidebar = usePathname() !== "/editor/settings";
  const leading = isMobileChrome || !hasSidebar || sidebarOpen ? EDGE_ROOM : TOGGLE_ROOM;
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const editorHref = editorFileHref(activeFilePath);

  return (
    <div
      // Past the open sidebar, as the editor page (EditorShell).
      style={{ left: "var(--content-left, 0px)", right: "var(--content-right, 0px)" }}
      className="app-sheet fixed inset-y-0 flex flex-col bg-surface transition-[left,right] duration-layout ease-layout motion-reduce:transition-none overflow-hidden overscroll-none font-sans text-ink-light selection:bg-sage/10 dark:text-ink-dark">
      <header
        style={{ paddingLeft: leading, paddingRight: "calc(2rem + var(--companion-toggle-room, 0px))" }}
        className={`flex shrink-0 items-center gap-3 border-b border-edge-subtle ${PANE_HEADER_HEIGHT} transition-[padding] duration-layout ease-layout motion-reduce:transition-none`}
      >
        <Button
          variant="unstyled"
          onClick={() => router.push(editorHref)}
          title="Back to editor"
          className="group inline-flex shrink-0 items-center gap-1.5 text-ui-footnote font-medium text-fg-faint transition-colors hover:text-fg focus:outline-none focus-visible:text-fg"
        >
          <HiOutlineArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Editor
        </Button>
        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-edge-subtle" />
        <span className="min-w-0 flex-1 truncate text-ui-subhead font-semibold select-none">{title}</span>
        {help && <PageHelpLink {...help} />}
        <DocumentationLink />
        <SearchPill className="shrink" />
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
