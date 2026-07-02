"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineDocument, HiOutlineSearch, HiOutlinePlus, HiOutlineChatAlt2, HiOutlineMicrophone, HiMicrophone } from "react-icons/hi";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useAtomValue } from "jotai";
import { atom_isAiBusy } from "@/app/atoms/atoms";

// Detects the on-screen keyboard via visualViewport height shrinking
// relative to the layout viewport — there's no direct "keyboard open" API.
function useIsKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      const shrink = window.innerHeight - vv.height;
      setIsOpen(shrink > 150);
    };
    handleResize();
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return isOpen;
}

export default function MobileBottomNav({
  onFiles,
  onNewFile,
  onChat,
  isChatAvailable,
  isVoiceSupported,
  isVoiceListening,
  onVoiceClick,
}: {
  onFiles: () => void;
  onNewFile: () => void;
  onChat?: () => void;
  isChatAvailable?: boolean;
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  onVoiceClick?: () => void;
}) {
  const isKeyboardOpen = useIsKeyboardOpen();
  const { open: openCommandPalette } = useCommandPalette();
  const isAiBusy = useAtomValue(atom_isAiBusy);

  if (isKeyboardOpen) return null;

  const items = [
    { icon: <HiOutlineDocument size={22} />, label: "Files", onClick: onFiles },
    { icon: <HiOutlinePlus size={22} />, label: "New File", onClick: onNewFile },
    ...(isVoiceSupported
      ? [{
          icon: isVoiceListening ? <HiMicrophone size={22} /> : <HiOutlineMicrophone size={22} />,
          label: isVoiceListening ? "Stop voice input" : "Start voice input",
          onClick: () => onVoiceClick?.(),
          active: isVoiceListening,
        }]
      : []),
    ...(isChatAvailable
      ? [{
          icon: <HiOutlineChatAlt2 size={22} />,
          label: "Open AI Chat",
          onClick: () => onChat?.(),
          active: isAiBusy,
        }]
      : []),
    { icon: <HiOutlineSearch size={22} />, label: "Search", onClick: openCommandPalette },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-chrome border-t border-edge-subtle h-14 pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-pressed={"active" in item ? item.active : undefined}
          className={`flex-1 h-full flex items-center justify-center active:text-accent ${
            "active" in item && item.active ? "text-accent animate-pulse" : "text-fg-muted"
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

export { useIsKeyboardOpen };
