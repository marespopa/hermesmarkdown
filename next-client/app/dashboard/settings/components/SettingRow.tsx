import React from "react";

interface SettingRowProps {
  title: string;
  description?: string;
  control: React.ReactNode;
}

export default function SettingRow({
  title,
  description,
  control,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
      <div className="flex flex-col">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: "JetBrains Mono, Fira Code, monospace" }}
        >
          {title}
        </span>
        {description && (
          <span
            className="text-xs text-neutral-500 mt-1"
            style={{ fontFamily: "JetBrains Mono, Fira Code, monospace" }}
          >
            {description}
          </span>
        )}
      </div>
      <div className="flex-shrink-0 ml-8">{control}</div>
    </div>
  );
}
