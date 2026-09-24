"use client";

import Input from "@/app/components/Input";

interface TitleFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function TitleField({ value, onChange, autoFocus }: TitleFieldProps) {
  return (
    <Input
      name="fm-title"
      label="Title"
      value={value}
      handleChange={(e) => onChange(e.target.value)}
      placeholder="e.g. Payment Integration Guide"
      autoFocus={autoFocus}
      className="my-0"
      inputClassName="!rounded-xl !border-edge-subtle !bg-surface/70 !px-3.5 !py-2 !text-ui-subhead dark:!bg-paper-dark-surface/50"
    />
  );
}
