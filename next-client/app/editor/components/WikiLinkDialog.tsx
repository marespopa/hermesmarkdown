"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { HiOutlineDocumentText } from "react-icons/hi";
import { atom_templates } from "@/app/atoms/template-atoms";
import TemplateIcon from "@/app/components/TemplateDialog/TemplateIcon";
import { matchTemplateForName, type TemplateEntry } from "@/app/utils/templates/template-registry";

interface WikiLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
  onCreateAndConfirm?: (fileName: string) => Promise<string | null>;
  /** "From template": creates the note from a template; resolves its link path or null. */
  onCreateFromTemplate?: (name: string, template: TemplateEntry) => Promise<string | null>;
  initialValue?: string;
  title?: string;
}

interface SearchItem {
  id: string;
  name: string;
  path: string;
  type: "file";
}

export default function WikiLinkDialog({
  isOpen,
  onClose,
  onConfirm,
  onCreateAndConfirm,
  onCreateFromTemplate,
  initialValue = "",
  title = "Edit WikiLink",
}: WikiLinkDialogProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const templates = useAtomValue(atom_templates);
  const [mode, setMode] = useState<"existing" | "new" | "template">("existing");
  const [templateNoteName, setTemplateNoteName] = useState("");
  // A template picked by hand; until then the name's match is preselected.
  const [pickedTemplatePath, setPickedTemplatePath] = useState<string | null>(null);
  const showTemplateTab = !!onCreateFromTemplate && templates.length > 0;
  const suggestedTemplate = useMemo(
    () => matchTemplateForName(templateNoteName, templates),
    [templateNoteName, templates],
  );
  const selectedTemplate = pickedTemplatePath
    ? templates.find((t) => t.path === pickedTemplatePath) ?? null
    : suggestedTemplate;
  const [search, setSearch] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const items = useMemo((): SearchItem[] => {
    return Object.values(fileMetadata)
      .filter((m) => !m.path.startsWith(".hermes/"))
      .map((m) => ({
        id: `file:${m.path}`,
        name: m.name.replace(/\.md$/, ""),
        path: m.path.replace(/\.md$/, ""),
        type: "file" as const,
      }));
  }, [fileMetadata]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return items.slice(0, 5);

    return items
      .filter((item) => {
        return (
          item.name.toLowerCase().includes(query) ||
          item.path.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aNameMatch = a.name.toLowerCase() === query;
        const bNameMatch = b.name.toLowerCase() === query;
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;

        const aStartsWith = a.name.toLowerCase().startsWith(query);
        const bStartsWith = b.name.toLowerCase().startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return a.path.length - b.path.length;
      })
      .slice(0, 5);
  }, [items, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setSearch(initialValue);
      setNewFileName("");
      setTemplateNoteName("");
      setPickedTemplatePath(null);
      setMode("existing");
      setIsCreating(false);
    }
  }, [isOpen, initialValue]);

  const handleCreateAndConfirm = async () => {
    const name = newFileName.trim();
    if (!name || !onCreateAndConfirm || isCreating) return;
    setIsCreating(true);
    try {
      const path = await onCreateAndConfirm(name);
      if (path) onConfirm(path);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    const name = templateNoteName.trim();
    if (!name || !selectedTemplate || !onCreateFromTemplate || isCreating) return;
    setIsCreating(true);
    try {
      const path = await onCreateFromTemplate(name, selectedTemplate);
      if (path) onConfirm(path);
    } finally {
      setIsCreating(false);
    }
  };

  // Switching to "From template" carries over the name typed so far.
  const openTemplateMode = () => {
    if (!templateNoteName) setTemplateNoteName(newFileName.trim() || search.trim());
    setMode("template");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) =>
          (prev - 1 + (filteredItems.length || 1)) %
          (filteredItems.length || 1),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onConfirm(filteredItems[selectedIndex].path);
      } else if (search) {
        onConfirm(search);
      }
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedElement = scrollContainerRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredItems]);

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={onClose}
      styles="!max-w-md"
      ariaLabelledBy="wiki-dialog-title"
    >
      <div className="flex flex-col gap-5">
        <h2
          id="wiki-dialog-title"
          className="text-ui-body font-semibold text-ink-light dark:text-ink-dark"
        >
          {title}
        </h2>

        {onCreateAndConfirm && (
          <div
            className={`grid ${showTemplateTab ? "grid-cols-3" : "grid-cols-2"} rounded-xl bg-paper-softgray p-1 dark:bg-paper-dark-surface`}
            role="tablist"
            aria-label="WikiLink target type"
          >
            <Button variant="unstyled"
              role="tab"
              aria-selected={mode === "existing"}
              onClick={() => setMode("existing")}
              className={`rounded-lg px-3 py-2 text-ui-footnote font-medium transition-colors ${
                mode === "existing"
                  ? "bg-white text-ink-light shadow-sm dark:bg-paper-dark dark:text-ink-dark"
                  : "text-ink-muted dark:text-stone"
              }`}
            >
              Existing note
            </Button>
            <Button variant="unstyled"
              role="tab"
              aria-selected={mode === "new"}
              onClick={() => setMode("new")}
              className={`rounded-lg px-3 py-2 text-ui-footnote font-medium transition-colors ${
                mode === "new"
                  ? "bg-white text-ink-light shadow-sm dark:bg-paper-dark dark:text-ink-dark"
                  : "text-ink-muted dark:text-stone"
              }`}
            >
              New note
            </Button>
            {showTemplateTab && (
              <Button variant="unstyled"
                role="tab"
                aria-selected={mode === "template"}
                onClick={openTemplateMode}
                className={`rounded-lg px-3 py-2 text-ui-footnote font-medium transition-colors ${
                  mode === "template"
                    ? "bg-white text-ink-light shadow-sm dark:bg-paper-dark dark:text-ink-dark"
                    : "text-ink-muted dark:text-stone"
                }`}
              >
                From template
              </Button>
            )}
          </div>
        )}

        {mode === "existing" ? (
          <>
            <Input
              name="wiki-search"
              label="Search existing notes"
              value={search}
              handleChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Search notes..."
              className="my-0"
            />

            <div
              ref={scrollContainerRef}
              className="flex flex-col gap-0.5 max-h-64 overflow-y-auto"
            >
              {filteredItems.map((item, i) => (
                <div
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onConfirm(item.path);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-ui-footnote rounded-xl transition-colors ${
                    i === selectedIndex
                      ? "bg-paper-softgray dark:bg-paper-dark-surface text-ink-light dark:text-ink-dark"
                      : "text-ink-muted dark:text-stone hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/50"
                  }`}
                >
                  <HiOutlineDocumentText size={16} className="shrink-0" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate">{item.name}</span>
                    {item.path !== item.name && (
                      <span className="text-[10px] opacity-60 truncate">
                        {item.path}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && search && (
                <div className="px-3 py-2 text-ui-footnote text-stone italic">
                  No matching note
                </div>
              )}
            </div>
          </>
        ) : mode === "template" ? (
          <div className="flex flex-col gap-2">
            <Input
              name="wiki-template-note-name"
              label="New note name"
              value={templateNoteName}
              handleChange={(e) => setTemplateNoteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateFromTemplate();
                }
              }}
              placeholder="e.g. Meeting notes 2026-10-05"
              className="my-0"
              autoFocus
            />
            <div role="radiogroup" aria-label="Template" className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {templates.map((template) => {
                const isSelected = selectedTemplate?.path === template.path;
                return (
                  <Button
                    key={template.path}
                    variant="unstyled"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setPickedTemplatePath(template.path)}
                    className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-ui-footnote transition-colors ${
                      isSelected
                        ? "bg-paper-softgray text-ink-light dark:bg-paper-dark-surface dark:text-ink-dark"
                        : "text-ink-muted hover:bg-paper-softgray dark:text-stone dark:hover:bg-paper-dark-surface/50"
                    }`}
                  >
                    <TemplateIcon name={template.name} />
                    <span className="flex-1 truncate font-medium">{template.name}</span>
                    {suggestedTemplate?.path === template.path && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-fg-faint">Suggested</span>
                    )}
                  </Button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-muted dark:text-stone">
              The note goes in the folder from its name or the template, else your New Notes folder.
            </p>
            <Button
              variant="primary"
              onClick={() => { void handleCreateFromTemplate(); }}
              isDisabled={!templateNoteName.trim() || !selectedTemplate || isCreating}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create from template and link"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              name="wiki-new-file-name"
              label="New note filename"
              value={newFileName}
              handleChange={(e) => setNewFileName(e.target.value)}
              placeholder="Filename"
              className="my-0"
              autoFocus
            />
            <p className="text-[11px] text-ink-muted dark:text-stone">
              Choose a vault folder after entering the filename.
            </p>
            <Button
              variant="primary"
              onClick={handleCreateAndConfirm}
              isDisabled={!newFileName.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create and link"}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          {mode === "existing" && (
            <Button
              variant="primary"
              onClick={() => onConfirm(filteredItems[selectedIndex]?.path || search)}
              isDisabled={!search && filteredItems.length === 0}
            >
              Link note
            </Button>
          )}
        </div>
      </div>
    </DialogModal>
  );
}
