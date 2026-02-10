import React from "react";
import Button from "@/app/components/Button";
import TemplateTags from "./components/TemplateTags";
import { MarkdownTemplate } from ".";

type Props = {
  filteredTemplates: MarkdownTemplate[];
  handleTemplateSelect: (template: MarkdownTemplate) => void;
};

const TemplateList = ({ filteredTemplates, handleTemplateSelect }: Props) => {
  if (!filteredTemplates || !filteredTemplates.length) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        No templates found. Try adjusting your search terms.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {filteredTemplates.map((template) => (
        <div
          key={template.filename}
          className="p-6 rounded-xl shadow border border-black dark:border-neutral-700 bg-amber-100 dark:bg-neutral-800"
        >
          <div className="flex flex-wrap gap-2">
            <TemplateTags tags={template.frontMatter.tags?.split(",")} maxVisible={3} />
          </div>
          <h3 className="font-bold text-black dark:text-white text-lg mt-6">
            {template.frontMatter.title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            {template.frontMatter.description}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => handleTemplateSelect(template)}
              styles="w-fit px-6 py-2 text-base"
            >
              Select
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateList; 