import React from "react";

export const SettingItem = ({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800/30 last:border-0">
    <div className="flex flex-col pr-4">
      <span className="text-ui-footnote font-medium leading-none">{label}</span>
      {description && (
        <span className="text-ui-footnote text-neutral-500 dark:text-neutral-400 mt-1.5 leading-tight">
          {description}
        </span>
      )}
    </div>
    <div className="flex-shrink-0">{control}</div>
  </div>
);

export const SettingGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6 last:mb-0">
    <h3 className="text-ui-footnote font-medium text-neutral-500 dark:text-neutral-400 mb-2.5 px-1">
      {title}
    </h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-[20px] px-4 py-1 border border-neutral-200/50 dark:border-neutral-800/50">
      {children}
    </div>
  </div>
);
