"use client";

import Input from "@/app/components/Input";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function DateField({ value, onChange, autoFocus }: DateFieldProps) {
  return (
    <Input
      name="fm-date"
      label="Date"
      value={value}
      handleChange={(e) => onChange(e.target.value)}
      placeholder="YYYY-MM-DD"
      autoFocus={autoFocus}
      className="my-0"
    />
  );
}
