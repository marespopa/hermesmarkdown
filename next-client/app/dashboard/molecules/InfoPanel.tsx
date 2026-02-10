"use client";

import Button from "@/app/components/Button";

type Props = {
  title: string;
  description: string;
  action: {
    label: string;
    handler: () => void;
    disabled?: boolean;
  };
  isHighlighted?: boolean;
};

export default function InfoPanel({
  description,
  title,
  action,
  isHighlighted,
}: Props) {
  return (
    <div
      className={`bg-softyellow dark:bg-darkbg text-strongblack dark:text-white rounded-xl shadow-md py-8 px-6 hover:scale-105 focus:scale-105 transition-transform duration-150 cursor-pointer ${
        isHighlighted ? "py-10 px-8" : ""
      }`}
      onClick={() => action.handler()}
    >
      <h3 className="text-2xl">{title}</h3>
      <p className="leading-relaxed mt-4">{description}</p>
      <div className="my-4 text-center">
        <Button
          label={action.label}
          onClick={action.handler}
          variant="primary"
          isDisabled={action.disabled}
        />
      </div>
    </div>
  );
}
