"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import { HiOutlineDocumentText } from "react-icons/hi";

interface WikiLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
  initialValue?: string;
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
  initialValue = "",
}: WikiLinkDialogProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    return Object.values(fileMetadata).map((m) => ({
      id: `file:${m.path}`,
      name: m.name.replace(/\.md$/, ""),
      path: m.path.replace(/\.md$/, ""),
      type: "file" as const,
    }));
  }, [fileMetadata]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return items.slice(0, 10);

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
      .slice(0, 10);
  }, [items, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setSearch(initialValue);
    }
  }, [isOpen, initialValue]);

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
          className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Edit WikiLink
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-ui-footnote text-zinc-500 dark:text-zinc-400">
            Target Note
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="Search notes..."
            className="px-3 py-2 text-ui-footnote rounded-xl border border-zinc-200 dark:border-zinc-700
              bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
              outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500
              transition-colors"
          />
        </div>

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
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
            <div className="px-3 py-2 text-ui-footnote text-zinc-400 italic">
              New note: "{search}"
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(filteredItems[selectedIndex]?.path || search)}
            isDisabled={!search && filteredItems.length === 0}
          >
            Save
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
