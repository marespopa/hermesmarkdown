"use client";

import React, { useRef, useState } from "react";
import { HiChevronDown, HiOutlineChat, HiOutlineDocumentText } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import Button from "@/app/components/Button";
import { PANE_HEADER_HEIGHT } from "../pane-header-classes";
import TabContextMenu from "../TabContextMenu";
import { useChatModels } from "../ai-chat/use-chat-models";

interface CompanionHeaderProps {
  open: boolean;
  onNewChat: () => void;
  onCompact: () => void;
  onClose: () => void;
  canStartOver: boolean;
  canCompact: boolean;
}

// The companion's title bar, level with the pages' and the sidebar's: its
// name, the model (shared with Settings) as a button that opens the app's
// own pop-up menu, Summarize chat, New chat and Close.
export default function CompanionHeader({ open, onNewChat, onCompact, onClose, canStartOver, canCompact }: CompanionHeaderProps) {
  const { modelOptions, selectedAiModel, setSelectedAiModel, isFetchingModels } = useChatModels(open);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const modelName = modelOptions.find((m) => m.id === selectedAiModel)?.name ?? selectedAiModel;

  return (
    <header className={`flex shrink-0 items-center gap-1 border-b border-edge-subtle pl-4 pr-3 ${PANE_HEADER_HEIGHT}`}>
      <h2 id="companion-title" className="shrink-0 text-ui-subhead font-semibold select-none">AI Companion</h2>
      <Button
        ref={modelRef}
        variant="small"
        className="ml-auto min-w-0 !h-7 !px-2"
        disabled={isFetchingModels || !modelOptions.length}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        title="Model"
        onClick={() => {
          if (menu) return setMenu(null);
          const rect = modelRef.current?.getBoundingClientRect();
          if (rect) setMenu({ x: rect.right, y: rect.bottom + 4 });
        }}
      >
        <span className="min-w-0 truncate">{modelName}</span>
        <HiChevronDown size={12} aria-hidden="true" className="shrink-0" />
      </Button>
      <Button variant="icon-small" onClick={onCompact} disabled={!canCompact} title="Summarize chat (/compact)" aria-label="Summarize chat">
        <HiOutlineDocumentText size={16} />
      </Button>
      <Button variant="icon-small" onClick={onNewChat} disabled={!canStartOver} title="New chat (/new)" aria-label="New chat">
        <HiOutlineChat size={16} />
      </Button>
      <Button variant="close" onClick={onClose} title="Close" aria-label="Close AI panel" className="ml-1">
        <IoClose size={18} aria-hidden="true" />
      </Button>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          align="end"
          label="Model"
          anchorRef={modelRef}
          onClose={() => setMenu(null)}
          items={modelOptions.map((m) => ({
            label: m.name,
            checked: m.id === selectedAiModel,
            onClick: () => setSelectedAiModel(m.id),
          }))}
        />
      )}
    </header>
  );
}
