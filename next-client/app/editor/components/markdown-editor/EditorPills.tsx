"use client";

import React from "react";
import { HiOutlineArrowsExpand, HiOutlineCalendar, HiOutlinePhotograph } from "react-icons/hi";
import { languages } from "@codemirror/language-data";
import Button from "@/app/components/Button";
import Typeahead from "@/app/components/Typeahead/Typeahead";
import DatePickerCallout from "../DatePickerCallout";
import { LinkPill } from "../LinkPill";
import { WorkflowPill } from "../WorkflowPill";
import { PILL_CONTAINER_CLASSES } from "../constants";
import type { useCodeMirrorFeatures } from "../../hooks/use-codemirror-features";
import type { useCodeMirrorCodeLanguagePicker } from "../../hooks/use-codemirror-code-language-picker";
import type { useCodeMirrorMermaid } from "../../hooks/use-codemirror-mermaid";
import type { useCodeMirrorImage } from "../../hooks/use-codemirror-image";
import { openImageDialog, openMermaidDialog } from "../../utils/open-helper-dialogs";

interface EditorPillsProps {
  features: ReturnType<typeof useCodeMirrorFeatures>;
  languagePicker: ReturnType<typeof useCodeMirrorCodeLanguagePicker>;
  mermaid: ReturnType<typeof useCodeMirrorMermaid>;
  image: ReturnType<typeof useCodeMirrorImage>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWikiLinkClick?: (name: string) => void;
}

// The floating helpers drawn over the editor next to the caret: date picker,
// link pill, workflow/task status pills, Mermaid and image viewer buttons,
// and the code-block language picker. Positions come from the CodeMirror
// feature hooks; this component only renders them.
export default function EditorPills({ features, languagePicker, mermaid, image, containerRef, onWikiLinkClick }: EditorPillsProps) {
  const {
    pillUrl, pillLabel, pillPos, pillType, dismissPill, handleSaveLink,
    dateMatch, isDateExpanded, setIsDateExpanded, dateMenuPos, handleDateSelect,
    workflowMatch, workflowMenuPos, handleWorkflowCycle,
    todoMatch, todoMenuPos, handleTodoCycle,
  } = features;
  const { languagePickerInfo, pickerPos, query, pickerRef, changeQuery, selectLanguage, deactivate } = languagePicker;

  return (
    <>
      {dateMatch && (
        <Button
          variant="pill-icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDateExpanded(!isDateExpanded);
          }}
          className={PILL_CONTAINER_CLASSES}
          style={{
            top: dateMenuPos.top - 2,
            left: Math.min(dateMenuPos.endLeft + 8, (containerRef.current?.clientWidth || 500) - 30),
          }}
          title="Toggle calendar (Ctrl/Cmd+Shift+Enter)"
          aria-label="Toggle calendar (Ctrl/Cmd+Shift+Enter)"
        >
          <HiOutlineCalendar size={16} />
        </Button>
      )}

      {dateMatch && (
        <DatePickerCallout
          isOpen={isDateExpanded}
          initialDate={dateMatch.date}
          onSelectDate={handleDateSelect}
          onClose={() => setIsDateExpanded(false)}
        />
      )}

      {pillUrl && (
        <LinkPill
          url={pillUrl}
          label={pillLabel}
          pos={pillPos}
          type={pillType || "url"}
          onOpen={() => {
            if (pillType === "wiki") {
              onWikiLinkClick?.(pillUrl);
            } else {
              window.open(pillUrl, "_blank", "noopener,noreferrer");
            }
            dismissPill();
          }}
          onSave={handleSaveLink}
          onDismiss={dismissPill}
        />
      )}

      {workflowMatch && (
        <WorkflowPill
          tag={workflowMatch.tag}
          pos={workflowMenuPos}
          onPrev={() => handleWorkflowCycle("prev")}
          onNext={() => handleWorkflowCycle("next")}
          noHash={workflowMatch.isFmStatus}
        />
      )}

      {todoMatch && (
        <WorkflowPill
          tag={todoMatch.tag}
          pos={todoMenuPos}
          onPrev={() => handleTodoCycle("prev")}
          onNext={() => handleTodoCycle("next")}
        />
      )}

      {mermaid.mermaidInfo && (
        <div
          style={{ top: mermaid.buttonPos.top, left: mermaid.buttonPos.left }}
          className={PILL_CONTAINER_CLASSES}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button
            variant="pill-icon"
            onClick={() => openMermaidDialog(mermaid.mermaidInfo!.source)}
            title="View Mermaid diagram (Ctrl/Cmd+Shift+Enter)"
          >
            <HiOutlineArrowsExpand size={14} aria-hidden="true" />
          </Button>
        </div>
      )}

      {languagePickerInfo && (
        <div
          ref={pickerRef}
          style={{ top: pickerPos.top, left: pickerPos.left }}
          className={`${PILL_CONTAINER_CLASSES} w-48`}
          onMouseDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Escape") deactivate();
          }}
        >
          <Typeahead
            name="code-block-language"
            value={query}
            onChange={changeQuery}
            onOptionSelect={selectLanguage}
            onDismiss={deactivate}
            options={languages.map((language) => language.name.toLowerCase())}
            autoFocus
            placeholder="Language..."
          />
        </div>
      )}

      {image.imageInfo && (
        <div
          style={{ top: image.buttonPos.top, left: image.buttonPos.left }}
          className={PILL_CONTAINER_CLASSES}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button
            variant="pill-icon"
            onClick={() => openImageDialog(image.imageInfo!.src, image.imageInfo!.alt)}
            title="View actual image (Ctrl/Cmd+Shift+Enter)"
            aria-label="View actual image (Ctrl/Cmd+Shift+Enter)"
          >
            <HiOutlinePhotograph size={14} />
          </Button>
        </div>
      )}
    </>
  );
}
