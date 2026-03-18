"use client";

import { FaTimes } from "react-icons/fa";
import Button from "@/app/components/Button/Button.component";

type Props = {
  onClick: () => void;
  ariaLabel?: string;
};

export default function CloseButton({ onClick, ariaLabel = "Close prompt" }: Props) {
  return (
    <Button
      variant="bare"
      onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
      onClick={onClick}
      styles="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      aria-label={ariaLabel}
    >
      <FaTimes className="h-3 w-3" />
    </Button>
  );
}
