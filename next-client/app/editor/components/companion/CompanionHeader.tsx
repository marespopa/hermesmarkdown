"use client";

import React, { useMemo, useState } from "react";
import { HiOutlinePencilAlt, HiOutlineX } from "react-icons/hi";
import Button from "@/app/components/Button";
import Typeahead from "@/app/components/Typeahead";
import { PANE_HEADER_HEIGHT } from "../pane-header-classes";
import { AUTO_MODEL_ID, AUTO_MODEL_LABEL } from "../ai-chat/auto-model";
import { useChatModels } from "../ai-chat/use-chat-models";

interface CompanionHeaderProps {
  open: boolean;
  onNewChat: () => void;
  onClose: () => void;
  canStartOver: boolean;
}

// The companion's title bar, level with the pages' and the sidebar's: its
// name, the model (shared with Settings) as a filterable typeahead, New chat
// and Close. Summarizing is a command (/compact),
// listed by the composer's / menu.
export default function CompanionHeader({ open, onNewChat, onClose, canStartOver }: CompanionHeaderProps) {
  const { modelOptions, selectedAiModel, setSelectedAiModel } = useChatModels(open);
  const [modelQuery, setModelQuery] = useState("");
  const { modelName, modelNames } = useMemo(() => ({
    modelName: selectedAiModel === AUTO_MODEL_ID
      ? AUTO_MODEL_LABEL
      : modelOptions.find((model) => model.id === selectedAiModel)?.name ?? selectedAiModel,
    modelNames: [AUTO_MODEL_LABEL, ...modelOptions.map((model) => model.name)],
  }), [modelOptions, selectedAiModel]);

  return (
    <header className={`flex shrink-0 items-center gap-1 border-b border-edge-subtle pl-4 pr-3 ${PANE_HEADER_HEIGHT}`}>
      <h2 id="companion-title" className="shrink-0 text-ui-subhead font-semibold select-none">AI Companion</h2>
      <Typeahead
        name="companion-model"
        ariaLabel="Model"
        value={modelQuery}
        onChange={setModelQuery}
        options={modelNames}
        maxResults={50}
        placeholder={modelName}
        className="ml-auto !my-0 w-44"
        inputClassName="!h-7 !py-1 !text-ui-footnote"
        onOptionSelect={(name) => {
          if (name === AUTO_MODEL_LABEL) {
            setSelectedAiModel(AUTO_MODEL_ID);
          } else {
            const model = modelOptions.find((option) => option.name === name);
            if (model) setSelectedAiModel(model.id);
          }
          setModelQuery("");
        }}
        onDismiss={() => setModelQuery("")}
      />
      <Button variant="icon-small" onClick={onNewChat} disabled={!canStartOver} title="New chat (/new)" aria-label="New chat">
        <HiOutlinePencilAlt size={16} />
      </Button>
      <Button variant="close" onClick={onClose} title="Close" aria-label="Close AI panel" className="ml-1">
        <HiOutlineX size={14} aria-hidden="true" />
      </Button>
    </header>
  );
}
