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
      className={`bg-amber-100 rounded-sm py-8 px-6  hover:scale-105 focus:scale-105 cursor-pointer ${
        isHighlighted ? "py-10 px-8" : ""
      }`}
      tabIndex={0}
      role="button"
      onClick={() => action.handler()}
      onKeyDown={handleKeyDown}
    >
      <h3 className="text-2xl">{title}</h3>
      <p className="leading-relaxed mt-4">{description}</p>
    </div>
  );
}
