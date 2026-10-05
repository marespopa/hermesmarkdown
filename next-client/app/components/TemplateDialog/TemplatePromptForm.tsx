"use client";

import React, { useState } from "react";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";

interface TemplatePromptFormProps {
  isOpen: boolean;
  /** Distinct `{{prompt:Label}}` labels, in first-appearance order. */
  labels: string[];
  /** Primary button label ("Create" / "Insert"). */
  confirmLabel: string;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

// "Fill in the template": one input per question (prompt label). The first field is focused
// (the overlay focuses the first control), Tab moves between fields, Enter in
// any field submits, Esc or Cancel cancels. Empty answers are allowed.
export default function TemplatePromptForm({
  isOpen,
  labels,
  confirmLabel,
  onSubmit,
  onCancel,
}: TemplatePromptFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const submit = () => onSubmit(Object.fromEntries(labels.map((label) => [label, values[label] ?? ""])));

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={onCancel}
      onConfirm={submit}
      hideCloseButton
      mobileSheet
      ariaLabelledBy="template-fields-title"
    >
      <div className="space-y-3">
        <h3 id="template-fields-title" className="text-ui-title-3 font-bold font-mono tracking-tight">
          Fill in the template
        </h3>
        <div>
          {labels.map((label, index) => (
            <Input
              key={label}
              name={`template-field-${index}`}
              label={label}
              value={values[label] ?? ""}
              handleChange={(e) => setValues((prev) => ({ ...prev, [label]: e.target.value }))}
              autoFocus={index === 0}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="primary" onClick={submit} className="w-full">
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
