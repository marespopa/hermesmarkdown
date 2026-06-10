"use client";

import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom_globalDialog } from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import DialogModal from "./DialogModal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Typeahead from "@/app/components/Typeahead";

export default function GlobalDialog() {
  const [config] = useAtom(atom_globalDialog);
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const [promptValue, setPromptValue] = useState("");
  const [newFileType, setNewFileType] = useState("note");
  const [newFileTags, setNewFileTags] = useState("");

  const existingTypes = Array.from(
    new Set(Object.values(fileMetadata).map((f) => f.frontmatter?.type).filter(Boolean))
  );
  const allTypes = Array.from(new Set(["note", "article", "project", "person", "meeting", ...existingTypes]));

  const allTags = Array.from(
    new Set(Object.values(fileMetadata).flatMap((f) => f.tags || []))
  ).sort();

  useEffect(() => {
    if (config?.type === "prompt") {
      setPromptValue(config.defaultValue || "");
    }
    if (config?.type === "new-file") {
      setPromptValue("");
      setNewFileType("note");
      setNewFileTags("");
    }
  }, [config]);

  if (!config) return null;

  const handleConfirm = () => {
    if (config.type === "new-file") {
      config.resolve({ name: promptValue, type: newFileType, tags: newFileTags });
    } else if (config.type === "prompt") {
      config.resolve(promptValue);
    } else if (config.type === "confirm") {
      config.resolve(true);
    } else {
      config.resolve(undefined);
    }
  };

  const handleCancel = () => {
    if (config.type === "confirm" || config.type === "prompt" || config.type === "new-file") {
      config.resolve(config.type === "confirm" ? false : null);
    } else {
      config.resolve(undefined);
    }
  };

  const isAlert = config.type === "alert";
  const isSelect = config.type === "select";

  return (
    <DialogModal
      isOpened={!!config}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      styles=""
      ariaLabelledBy="dialog-title"
      ariaDescribedBy="dialog-description"
    >
      <div className="space-y-4">
        {config.title && (
          <h3
            id="dialog-title"
            className="text-ui-title-3 font-bold font-mono tracking-tight"
          >
            {config.title}
          </h3>
        )}

        <p
          id="dialog-description"
          className="text-ui-subhead leading-relaxed"
        >
          {config.message}
        </p>

        {config.subtext && (
          <p className="text-ui-caption leading-relaxed">{config.subtext}</p>
        )}

        {(config.type === "prompt" || config.type === "new-file") && (
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              {config.type === "new-file" && <label className="text-ui-caption font-medium">File Name</label>}
              <Input
                name="prompt-input"
                value={promptValue}
                handleChange={(e) => setPromptValue(e.target.value)}
                placeholder={config.type === "new-file" ? "e.g. meeting-notes" : "Enter value..."}
                autoFocus
                selectOnFocus
              />
            </div>
            
            {config.type === "new-file" && (
              <>
                <Typeahead
                  name="new-file-type"
                  label="Type"
                  value={newFileType}
                  onChange={setNewFileType}
                  options={allTypes as string[]}
                  placeholder="e.g. note, project, person"
                />
                
                <Typeahead
                  name="new-file-tags"
                  label="Tags (comma separated)"
                  value={newFileTags}
                  onChange={setNewFileTags}
                  options={allTags}
                  placeholder="e.g. work, urgent"
                  allowMultiple
                />
              </>
            )}
          </div>
        )}

        {isSelect && config.options && (
          <div className="flex flex-col gap-1.5 py-2">
            {config.options.map((opt) => (
              <Button
                key={opt.value}
                variant="menu-item"
                onClick={() => config.resolve(opt.value)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ui-subhead font-medium text-left hover:bg-paper-softgray dark:hover:bg-paper-dark-surface transition-colors border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-700/60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {!isSelect && (
          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="primary"
              onClick={handleConfirm}
              className="w-full order-1"
            >
              {config.confirmLabel || (isAlert ? "Okay" : "Confirm")}
            </Button>
            {!isAlert && (
              <Button
                variant="secondary"
                onClick={handleCancel}
                className="w-full order-2"
              >
                {config.cancelLabel || "Cancel"}
              </Button>
            )}
          </div>
        )}
        {isSelect && (
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="w-full mt-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </DialogModal>
  );
}
