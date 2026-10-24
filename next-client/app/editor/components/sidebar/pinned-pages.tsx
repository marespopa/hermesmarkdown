import React, { type ReactNode } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlineHashtag,
  HiOutlineTemplate,
  HiOutlineTrash,
} from "react-icons/hi";
import type { Pin, PinPage } from "@/app/services/pins-model";
import { SIDEBAR_ICON_CLASS } from "./sidebar-classes";

const ICON = { size: 15, "aria-hidden": true, className: SIDEBAR_ICON_CLASS } as const;

// The app pages a pin can open: every /editor page the palette navigates to
// (the hrefs match AppCommands' page commands and Open Settings).
export const PINNED_PAGES: Record<PinPage, { label: string; href: string; icon: ReactNode }> = {
  files: { label: "All Files", href: "/editor/files", icon: <HiOutlineCollection {...ICON} /> },
  tags: { label: "Tags", href: "/editor/tags", icon: <HiOutlineHashtag {...ICON} /> },
  tasks: { label: "Tasks", href: "/editor/tasks", icon: <HiOutlineCheckCircle {...ICON} /> },
  templates: { label: "Templates", href: "/editor/templates", icon: <HiOutlineTemplate {...ICON} /> },
  trash: { label: "Trash", href: "/editor/trash", icon: <HiOutlineTrash {...ICON} /> },
  settings: { label: "Settings", href: "/editor/settings", icon: <HiOutlineCog {...ICON} /> },
};

// A pinned row's leading glyph when it has no emoji icon.
export function pinGlyph(pin: Pin): ReactNode {
  switch (pin.kind) {
    case "note":
      return <HiOutlineDocumentText {...ICON} />;
    case "folder":
      return <HiOutlineFolder {...ICON} />;
    case "tag":
      return <span aria-hidden="true" className={`${SIDEBAR_ICON_CLASS} w-[15px] text-center`}>#</span>;
    case "page":
      return PINNED_PAGES[pin.target as PinPage]?.icon ?? null;
  }
}
