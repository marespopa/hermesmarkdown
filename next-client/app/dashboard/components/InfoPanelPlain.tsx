"use client";

import Button from "@/app/components/Button/Button.component";
import { useCommand } from "@/app/hooks/use-command";
import React, { JSX } from "react";

type Props = {
  description: string | JSX.Element;
  title: string | JSX.Element;
  action: {
    label: string;
    handler: () => void;
    disabled?: boolean;
  };
  isHighlighted?: boolean;
};

export default function InfoPanelPlain({
  description,
  title,
  action,
  isHighlighted,
}: Props) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      action.handler();
    }
  };

  return (
    <div
      className={`bg-amber-100 dark:bg-gray-800 rounded-sm py-8 px-6 cursor-pointer transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:focus-visible:ring-amber-300 transform hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-lg ${
        isHighlighted ? "py-10 px-8" : ""
      }`}
      tabIndex={0}
      role="button"
      onClick={() => action.handler()}
      onKeyDown={handleKeyDown}
    >
      <h3 className="text-2xl text-gray-900 dark:text-white">{title}</h3>
      <p className="leading-relaxed mt-4 text-gray-700 dark:text-gray-300">{description}</p>
    </div>
  );
}
