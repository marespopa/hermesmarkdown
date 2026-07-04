"use client";

import {
  HiOutlineDocument,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineCollection,
  HiOutlineCheckCircle,
  HiOutlineHome,
  HiOutlineBookOpen,
  HiOutlineCog,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineMicrophone,
  HiMicrophone,
} from "react-icons/hi";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import { RailPanel } from "@/app/atoms/ui-atoms";

export type { RailPanel };

function RailButton({
  icon,
  label,
  shortcut,
  isActive,
  activeClassName = "text-accent",
  pill = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive: boolean;
  activeClassName?: string;
  pill?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group/rail-item">
      <button
        type="button"
        onClick={onClick}
        aria-label={shortcut ? `${label} (${shortcut})` : label}
        className={
          pill
            ? `w-9 h-9 rounded-full flex items-center justify-center transition-colors text-white ${
                isActive ? "bg-accent animate-pulse" : "bg-sage hover:bg-accent"
              }`
            : `w-9 h-9 flex items-center justify-center transition-colors ${
                isActive ? activeClassName : "text-sage hover:text-fg"
              }`
        }
      >
        {icon}
      </button>
      <span
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap bg-overlay border border-edge text-fg text-ui-caption px-2 py-1 opacity-0 group-hover/rail-item:opacity-100 transition-opacity delay-[400ms] z-50"
      >
        {label}
        {shortcut && <span className="opacity-50 ml-1.5">{shortcut}</span>}
      </span>
    </div>
  );
}

export default function IconRail({
  activePanel,
  onPanelChange,
  onOpenSettings,
  onOpenDocumentation,
  onHome,
  isVoiceSupported,
  isVoiceListening,
  onVoiceClick,
}: {
  activePanel: RailPanel | null;
  onPanelChange: (panel: RailPanel) => void;
  onOpenSettings?: () => void;
  onOpenDocumentation?: () => void;
  onHome?: () => void;
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  onVoiceClick?: () => void;
}) {
  const [theme, setTheme] = useAtom(atom_theme);

  return (
    <div className="flex flex-col items-center justify-between py-3 w-10 shrink-0 border-r border-edge-subtle bg-chrome">
      <div className="flex flex-col items-center gap-3">
        <RailButton
          icon={<HiOutlineSearch size={18} />}
          label="Search"
          isActive={activePanel === "search"}
          onClick={() => onPanelChange("search")}
        />
        {isVoiceSupported && (
          <RailButton
            icon={isVoiceListening ? <HiMicrophone size={16} /> : <HiOutlineMicrophone size={16} />}
            label={isVoiceListening ? "Stop voice input" : "Start voice input"}
            shortcut="Ctrl+Shift+V"
            isActive={!!isVoiceListening}
            pill
            onClick={() => onVoiceClick?.()}
          />
        )}
        <RailButton
          icon={<HiOutlineDocument size={18} />}
          label="Files"
          isActive={activePanel === "files"}
          onClick={() => onPanelChange("files")}
        />
        <RailButton
          icon={<HiOutlineTag size={18} />}
          label="Tags"
          isActive={activePanel === "tags"}
          onClick={() => onPanelChange("tags")}
        />
        <RailButton
          icon={<HiOutlineCheckCircle size={18} />}
          label="Tasks"
          isActive={activePanel === "tasks"}
          onClick={() => onPanelChange("tasks")}
        />
        <RailButton
          icon={<HiOutlineCollection size={18} />}
          label="Views"
          isActive={activePanel === "views"}
          onClick={() => onPanelChange("views")}
        />
      </div>
      <div className="flex flex-col items-center gap-3">
        <RailButton
          icon={<HiOutlineHome size={18} />}
          label="Home"
          isActive={false}
          onClick={() => onHome?.()}
        />
        <RailButton
          icon={<HiOutlineBookOpen size={18} />}
          label="Documentation"
          isActive={false}
          onClick={() => onOpenDocumentation?.()}
        />
        <RailButton
          icon={<HiOutlineCog size={18} />}
          label="Settings"
          isActive={false}
          onClick={() => onOpenSettings?.()}
        />
        <RailButton
          icon={theme === "dark" ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
          label="Toggle theme"
          isActive={false}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
      </div>
    </div>
  );
}
