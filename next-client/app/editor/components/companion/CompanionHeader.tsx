"use client";

import React, { useRef, useState } from "react";
import { HiChevronDown, HiOutlinePencilAlt, HiOutlineX } from "react-icons/hi";
import Button from "@/app/components/Button";
import { PANE_HEADER_HEIGHT } from "../pane-header-classes";
import TabContextMenu from "../TabContextMenu";
import { AUTO_MODEL_ID } from "../ai-chat/auto-model";
import { useChatModels } from "../ai-chat/use-chat-models";

interface CompanionHeaderProps {
  open: boolean;
  onNewChat: () => void;
  onClose: () => void;
  canStartOver: boolean;
}

// The companion's title bar, level with the pages' and the sidebar's: its
// name, the model (shared with Settings) as a button that opens the app's
// own pop-up menu, New chat and Close. Summarizing is a command (/compact),
// listed by the composer's / menu.
export default function CompanionHeader({ open, onNewChat, onClose, canStartOver }: CompanionHeaderProps) {
  const { modelOptions, selectedAiModel, setSelectedAiModel } = useChatModels(open);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const modelName = selectedAiModel === AUTO_MODEL_ID ? "Auto" : modelOptions.find((m) => m.id === selectedAiModel)?.name ?? selectedAiModel;

  return (
    <header className={`flex shrink-0 items-center gap-1 border-b border-edge-subtle pl-4 pr-3 ${PANE_HEADER_HEIGHT}`}>
      <h2 id="companion-title" className="shrink-0 text-ui-subhead font-semibold select-none">AI Companion</h2>
      <Button
        ref={modelRef}
        variant="small"
        className="ml-auto min-w-0 !h-7 !px-2"
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
      <Button variant="icon-small" onClick={onNewChat} disabled={!canStartOver} title="New chat (/new)" aria-label="New chat">
        <HiOutlinePencilAlt size={16} />
      </Button>
      <Button variant="close" onClick={onClose} title="Close" aria-label="Close AI panel" className="ml-1">
        <HiOutlineX size={14} aria-hidden="true" />
      </Button>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          align="end"
          label="Model"
          anchorRef={modelRef}
          onClose={() => setMenu(null)}
          items={[
            { label: "Auto", checked: selectedAiModel === AUTO_MODEL_ID, onClick: () => setSelectedAiModel(AUTO_MODEL_ID) },
            ...modelOptions.map((m) => ({
              label: m.name,
              checked: m.id === selectedAiModel,
              onClick: () => setSelectedAiModel(m.id),
            })),
          ]}
        />
      )}
    </header>
  );
}
