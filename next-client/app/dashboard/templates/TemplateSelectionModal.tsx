"use client";

import {
  atom_frontMatter,
  atom_content,
  atom_contentEdited,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal";
import { useAtom } from "jotai";
import React, { FormEvent, useEffect, useState } from "react";
import MarkdownTemplateList, { MarkdownTemplate } from ".";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import TemplateTags from "./components/TemplateTags";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { SPINNER_LOADING_DURATION } from "@/app/constants/timer";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const TemplateSelectionModal = ({ isOpen, handleClose }: Props) => {
  const router = useRouter();
  const [, setFrontMatter] = useAtom(atom_frontMatter);
  const [, setContent] = useAtom(atom_content);
  const [, setContentEdited] = useAtom(atom_contentEdited);
  const [searchTerm, setSearchTerm] = useState("");
  const templates = MarkdownTemplateList;
  const isMobile = useIsMobile();
  const filteredTemplates = templates.filter((template) => {
    const isTitleMatching = template.frontMatter.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const isTagMatching = template.frontMatter.tags
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return isTitleMatching || isTagMatching;
  });
  const uniqueTags = getUniqueTags(templates);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [showTagsCluster, setShowTagsCluster] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);
  useEffect(() => { setShowTagsCluster(!isMobile)}, [isMobile]);

  if (!isMounted) {
    return <></>;
  }

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={handleClose}
    >
      {isLoadingTemplate && <LoadingOverlay isVisible={true} text="Loading..." />}
      {!isLoadingTemplate && (
        <>
          {renderModalHeader()}
          {renderTagsToggle()}
          {showTagsCluster && renderTagsCluster()}
          {renderSearchBar()}
          {renderTemplates()}
        </>
      )}
    </DialogModal>
  );

  function renderTagsToggle() {
    return (
      <div className="my-2">
        <Button
          variant="secondary"
          styles="text-sm"
          handler={() => setShowTagsCluster(!showTagsCluster)}
        >
          {showTagsCluster ? "Hide Tags" : "Show Tags"}
        </Button>
      </div>
    );
  }

  function renderTagsCluster() {
    if (!showTagsCluster) {
      return <></>;
    }

    return (
      <div className="flex flex-wrap gap-2 mb-4 max-h-">
        {uniqueTags.map((tag) => (
          <button
            key={tag}
            className={`px-3 py-1 rounded-sm text-sm ${
              selectedTag === tag
                ? "bg-amber-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            }`}
            onClick={() => {
              // Deselect
              if (selectedTag === tag) {
                // Select
                setSearchTerm("");
                setSelectedTag(null);
              } else {
                // Select
                setSearchTerm(tag);
                setSelectedTag(tag);
              }
            }}
          >
            {tag}
          </button>
        ))}
      </div>
    );
  }

  function getUniqueTags(templates: MarkdownTemplate[]) {
    const allTags = templates.flatMap((template) =>
      template.frontMatter.tags.split(",")
    );
    return Array.from(new Set(allTags));
  }

  function renderModalHeader() {
    return (
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Select a Template</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose from pre-built templates to get started quickly.
        </p>
      </div>
    );
  }

  function renderSearchBar() {
    return (
      <div className="mb-4 max-w-[450px]">
        <input
          type="text"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
          placeholder="Search templates by name or tag..."
          value={searchTerm}
          onChange={(e: FormEvent<HTMLInputElement>) => {
            const element = e.currentTarget as HTMLInputElement;
            const value = element.value;

            setSearchTerm(value);
          }}
        />
      </div>
    );
  }

  function renderTemplates() {
    if (!filteredTemplates || !filteredTemplates.length) {
      return (
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">
          No templates found. Try adjusting your search terms.
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[1rem]">
        {filteredTemplates.map((template, index) =>
          renderTemplateAsCard(template, index)
        )}
      </div>
    );
  }

  function renderTemplateAsCard(template: MarkdownTemplate, index: number) {
    const tags = template.frontMatter.tags?.split(",");

    return (
      <div
        key={template.filename}
        className={`p-4 rounded-sm shadow-sm bg-slate-100 dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-gray-700 focus:bg-amber-100 dark:focus:bg-gray-700`}
      >
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tags && <TemplateTags tags={tags} maxVisible={3} />}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base mt-6">
          {template.frontMatter.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {template.frontMatter.description}
        </p>

        {/* Select Button */}
        <Button
          label={"Select"}
          handler={() => loadFileFromTemplate(template)}
          variant="secondary"
          isDisabled={isLoadingTemplate}
          styles="mt-4"
        />
      </div>
    );
  }

  function loadFileFromTemplate(template: MarkdownTemplate) {
    setIsLoadingTemplate(true);
    setFrontMatter({
      fileName: template.filename || "",
      title: template.frontMatter?.title || "",
      description: template.frontMatter?.description || "",
      tags: template.frontMatter?.tags,
    });
    setContent(template.content);
    setContentEdited(template.content);
    router.push("/dashboard/editor");
    setTimeout(() => {
      setIsLoadingTemplate(false);
      handleClose();
    }, SPINNER_LOADING_DURATION); // Delay of 2 seconds
  }
};

export default TemplateSelectionModal;
