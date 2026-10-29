"use client";

import React, { useState } from "react";
import { HiChevronDown } from "react-icons/hi";
import { VscLayoutSidebarRight } from "react-icons/vsc";
import Button from "@/app/components/Button";
import Typeahead from "@/app/components/Typeahead";
import { PANE_HEADER_HEIGHT, PANE_ICON_SIZE } from "../pane-header-classes";
import PaneToolbarButton from "../PaneToolbarButton";
import { AUTO_MODEL_ID, AUTO_MODEL_LABEL } from "../ai-chat/auto-model";
import { useChatModels } from "../ai-chat/use-chat-models";

interface CompanionHeaderProps {
  open: boolean;
  onClose: () => void;
}

// The companion's title bar, level with the pages' and the sidebar's: its
// name, the model (shared with Settings) as a filterable typeahead, and its
// right-edge collapse control. Summarizing is a command (/compact), listed by
// the composer's / menu.
export default function CompanionHeader({ open, onClose }: CompanionHeaderProps) {
  const { modelOptions, selectedAiModel, setSelectedAiModel } = useChatModels(open);
  const [isChoosingModel, setIsChoosingModel] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const modelName = selectedAiModel === AUTO_MODEL_ID
    ? AUTO_MODEL_LABEL
    : modelOptions.find((model) => model.id === selectedAiModel)?.name ?? selectedAiModel;
  // Two models can share a display name; the picker lists it once (a name picks the first).
  const modelNames = [...new Set([AUTO_MODEL_LABEL, ...modelOptions.map((model) => model.name)])];

  return (
    <header className={`flex shrink-0 items-center gap-1 border-b border-edge-subtle pl-4 pr-3 ${PANE_HEADER_HEIGHT}`}>
      <h2 id="companion-title" className="shrink-0 text-ui-subhead font-semibold select-none">AI Companion</h2>
      {isChoosingModel ? (
        <Typeahead
          name="companion-model"
          ariaLabel="Model"
          value={modelQuery}
          onChange={setModelQuery}
          options={modelNames}
          placeholder={modelName}
          className="ml-auto !my-0 w-44"
          inputClassName="!h-7 !py-1 !text-ui-footnote"
          autoFocus
          onOptionSelect={(name) => {
            if (name === AUTO_MODEL_LABEL) {
              setSelectedAiModel(AUTO_MODEL_ID);
            } else {
              const model = modelOptions.find((option) => option.name === name);
              if (model) setSelectedAiModel(model.id);
            }
            setModelQuery("");
            setIsChoosingModel(false);
          }}
          onDismiss={() => {
            setModelQuery("");
            setIsChoosingModel(false);
          }}
        />
      ) : (
        <Button
          variant="small"
          className="ml-auto min-w-0 !h-7 !px-2"
          aria-haspopup="listbox"
          title="Model"
          onClick={() => setIsChoosingModel(true)}
        >
          <span className="min-w-0 truncate">{modelName}</span>
          <HiChevronDown size={12} aria-hidden="true" className="shrink-0" />
        </Button>
      )}
      <PaneToolbarButton
        icon={<VscLayoutSidebarRight size={PANE_ICON_SIZE} />}
        label="Hide AI companion"
        onClick={onClose}
        className="shrink-0"
      />
    </header>
  );
}
