import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  HiChevronRight,
  HiFolder,
  HiOutlineCode,
  HiOutlineDatabase,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
} from "react-icons/hi";
import DemoFrame from "./DemoFrame";
import { Line } from "./LandingLoop";

// The files chapter's picture, still: the editor with its sidebar open, drawn
// from the sidebar's own classes and glyphs. Pinned notes lead with the emoji
// picked for them (SidebarPinned), and the Files tree lists notes beside the
// code and images the editor also opens (FileIcon's glyphs, FolderRow's
// folder). The open note sits on the right, as the editor draws it.

// sidebar-classes.ts: SIDEBAR_ITEM_CLASS, SIDEBAR_ITEM_CURRENT_CLASS, SIDEBAR_ICON_CLASS.
const ROW = "flex h-6 items-center gap-1.5 rounded-md px-1.5 sm:h-7 sm:gap-2 sm:px-2";
const CURRENT = "bg-accent/15 text-fg";
const ICON = "shrink-0 text-fg-faint";

export const PINS = [
  { icon: "🚀", label: "Release plan", current: true },
  { icon: "🗺️", label: "Roadmap" },
  { icon: "✅", label: "Tasks" },
];

type TreeFile = { name: string; Icon: IconType; current?: boolean };
export const TREE: TreeFile[] = [
  { name: "Release plan.md", Icon: HiOutlineDocumentText, current: true },
  { name: "Roadmap.md", Icon: HiOutlineDocumentText },
  { name: "build.ts", Icon: HiOutlineCode },
  { name: "config.yaml", Icon: HiOutlineCode },
  { name: "cover.png", Icon: HiOutlinePhotograph },
];

const NOTE = ["# Release plan", "", "- [x] Export to PDF", "- [ ] Dark theme", "", "Next, the [roadmap](Roadmap.md)."];

// SidebarSection's header: a faint caption led by its chevron, open.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pb-2 pt-1">
      <p className="flex h-6 items-center gap-1.5 px-1.5 text-fg-faint sm:h-7">
        <HiChevronRight size={11} className="shrink-0 rotate-90" />
        {title}
      </p>
      <div className="flex flex-col gap-px pt-0.5">{children}</div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="flex w-[44%] shrink-0 flex-col overflow-hidden border-r border-edge-subtle bg-surface px-1.5 pt-2 font-sans text-[11px] text-fg sm:w-[34%] sm:px-2 sm:pt-3 sm:text-ui-footnote">
      {/* SidebarHeader: the vault's icon and name. */}
      <p className="flex h-7 items-center gap-1.5 px-1.5 font-semibold">
        <HiOutlineDatabase size={14} className={ICON} />
        <span className="truncate">Product notes</span>
      </p>
      <Section title="Pinned">
        {PINS.map((pin) => (
          <p key={pin.label} data-pin className={`${ROW} ${pin.current ? CURRENT : ""}`}>
            <span className="w-[15px] text-center text-[12px] leading-none sm:text-[13px]">{pin.icon}</span>
            <span className="truncate">{pin.label}</span>
          </p>
        ))}
      </Section>
      <Section title="Files">
        <p className={ROW}>
          <HiChevronRight size={11} className={`${ICON} rotate-90`} />
          <HiFolder size={15} className="shrink-0 text-sage" />
          <span className="truncate">Launch</span>
        </p>
        {TREE.map(({ name, Icon, current }) => (
          <p key={name} data-file className={`${ROW} pl-5 sm:pl-6 ${current ? CURRENT : ""}`}>
            <Icon size={15} className={ICON} />
            <span className="truncate">{name}</span>
          </p>
        ))}
      </Section>
    </div>
  );
}

export default function DemoFiles() {
  return (
    <DemoFrame
      label="The editor's sidebar: pinned notes with emoji icons, and a folder of notes, code and images, with a note open beside it."
      sidebar={<Sidebar />}
    >
      {NOTE.map((text, index) => (
        <Line key={index} text={text} caret={false} />
      ))}
    </DemoFrame>
  );
}
