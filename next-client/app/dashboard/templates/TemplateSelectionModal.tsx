"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_files,
  atom_canOpenMoreFiles,
  atom_selectedFileId,
  OpenFile,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { SPINNER_LOADING_DURATION } from "@/app/constants/timer";
import Input from "@/app/components/Input";
import { FaTag } from "react-icons/fa";
import Badge from "@/app/components/Badges/Badge";
import MarkdownTemplateList, { MarkdownTemplate } from ".";
import TemplateList from "./TemplateList";
import { showErrorToast, showSuccessToast } from "@/app/components/Toastr";
import { v4 as uuidv4 } from 'uuid';

// Utility: Get unique tags from all templates
function getUniqueTags(templates: MarkdownTemplate[]) {
  const allTags = templates.flatMap((template) =>
    template.frontMatter.tags.split(",")
  );
  return Array.from(new Set(allTags));
}

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const TemplateSelectionModal = ({ isOpen, handleClose }: Props) => {
  const router = useRouter();
  const [files, setFiles] = useAtom(atom_files);
  const [canOpenMoreFiles] = useAtom(atom_canOpenMoreFiles);
  const [, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [showTagsCluster, setShowTagsCluster] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useIsMobile();
  const templates = MarkdownTemplateList;
  const uniqueTags = getUniqueTags(templates);

  // Filter templates by search term
  const filteredTemplates = templates.filter((template) => {
    const isTitleMatching = template.frontMatter.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const isTagMatching = template.frontMatter.tags
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return isTitleMatching || isTagMatching;
  });

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm("");
    setSelectedTag(null);
    setShowTagsCluster(false);
  }, [isOpen]);

  if (!isMounted) return null;

  // Handlers
  function handleTagClick(tag: string) {
    if (selectedTag === tag) {
      setSearchTerm("");
      setSelectedTag(null);
    } else {
      setSearchTerm(tag);
      setSelectedTag(tag);
    }
  }

  function handleTemplateSelect(template: MarkdownTemplate) {
    if (!canOpenMoreFiles) {
      showErrorToast("Maximum 3 files can be open at once");
      return;
    }

    setIsLoadingTemplate(true);
    
    const newFileId = uuidv4();
    const newFile: OpenFile = {
      id: newFileId,
      content: template.content,
      contentEdited: template.content,
      frontMatter: {
        fileName: template.filename || "",
        title: template.frontMatter?.title || "",
        description: template.frontMatter?.description || "",
        tags: template.frontMatter?.tags,
      },
      isSaved: true,
    };
    
    setFiles([...files, newFile]);
    setSelectedFileId(newFileId);
    
    showSuccessToast(`Template "${template.frontMatter?.title}" loaded`);
    router.push("/dashboard/editor");
    setTimeout(() => {
      setIsLoadingTemplate(false);
      handleClose();
    }, SPINNER_LOADING_DURATION);
  }

  // Renderers
  function renderTagsToggle() {
    return (
      <div>
        <Button
          variant="secondary"
          styles="flex items-center gap-2"
          onClick={() => setShowTagsCluster(!showTagsCluster)}
        >
          <FaTag className="inline-block mr-1" />
          {showTagsCluster ? "Hide Tags" : "Show Tags"}
        </Button>
      </div>
    );
  }

  function renderTagsCluster() {
    if (!showTagsCluster) return null;
    return (
      <div className="bg-amber-50 dark:bg-gray-800 flex flex-wrap gap-2 items-start justify-start rounded-lg p-2">
        {uniqueTags.map((tag) => (
          <Button
            key={tag}
            variant="bare"
            styles="p-1"
            onClick={() => handleTagClick(tag)}
          >
            <Badge label={tag} variant="accent" />
          </Button>
        ))}
      </div>
    );
  }

  function renderSearchBar() {
    return (
      <Input
        name="template-search"
        value={searchTerm}
        placeholder="Search templates..."
        handleChange={(e: FormEvent<HTMLInputElement>) => {
          const element = e.currentTarget as HTMLInputElement;
          setSearchTerm(element.value);
        }}
        type="text"
        onClear={() => setSearchTerm("")}
      />
    );
  }

  // Main render
  return (
    <DialogModal
      isOpened={isOpen}
      onClose={handleClose}
    >
      {isLoadingTemplate && <LoadingOverlay isVisible={true} text="Loading..." />}
      {!isLoadingTemplate && (
        <div className="w-full max-w-xl mx-auto py-4 px-2 sm:px-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Select a Template</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start from a contract-style prompt template to run experiments faster.
            </p>
          </div>
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between w-full">
              <div className="flex-1 w-full">{renderSearchBar()}</div>
              <div className="hidden sm:block w-full sm:w-auto">{renderTagsToggle()}</div>
            </div>
            {showTagsCluster && (
              <div className="hidden sm:block w-full">{renderTagsCluster()}</div>
            )}
          </div>
          <TemplateList filteredTemplates={filteredTemplates} handleTemplateSelect={handleTemplateSelect} />
        </div>
      )}
    </DialogModal>
  );
};

export default TemplateSelectionModal;
