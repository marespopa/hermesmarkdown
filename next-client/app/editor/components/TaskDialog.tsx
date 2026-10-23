"use client";

import React, { useEffect, useMemo, useState } from "react";
import { HiChevronDown } from "react-icons/hi";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button, { SEGMENT_TRACK_CLASS } from "../../components/Button";
import Input, { FIELD_CLASS } from "../../components/Input";
import { buildTaskText, type TaskPriority, type TaskStatus } from "../utils/task-template";

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "prog", label: "In Progress" },
  { value: "hold", label: "On Hold" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority | ""; label: string }[] = [
  { value: "", label: "No priority" },
  { value: "high", label: "High" },
  { value: "med", label: "Medium" },
  { value: "low", label: "Low" },
];

const formatDateValue = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (days: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return formatDateValue(date);
};

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 my-2 w-full">
      <label htmlFor={id} className="text-ui-footnote font-medium text-fg-muted px-0.5">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={`${FIELD_CLASS} w-full appearance-none cursor-pointer pr-9`}
        >
          {options.map((opt) => (
            <option
              key={opt.value || "none"}
              value={opt.value}
              className="bg-input-bg text-fg"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <HiChevronDown
          size={16}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
        />
      </div>
    </div>
  );
}

export default function TaskDialog({ isOpen, onClose, onConfirm }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setStatus("todo");
    setPriority("");
    setDueDate("");
    setTagsInput("");
  }, [isOpen]);

  const tags = useMemo(
    () => tagsInput.split(/\s+/).map((tag) => tag.replace(/^#/, "")).filter(Boolean),
    [tagsInput],
  );

  const preview = useMemo(
    () => buildTaskText({ title, status, dueDate, priority: priority || undefined, tags }),
    [title, status, dueDate, priority, tags],
  );

  const handleConfirm = () => {
    onConfirm(preview);
    onClose();
  };

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-lg" ariaLabelledBy="task-dialog-title">
      <div className="flex flex-col gap-3">
        <h2 id="task-dialog-title" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark mb-1">
          New task
        </h2>

        <Input
          name="task-title"
          label="Title"
          value={title}
          handleChange={(e) => setTitle(e.target.value)}
          placeholder="Write task title..."
          autoFocus
          className="my-0"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="task-status"
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
          />
          <SelectField
            id="task-priority"
            label="Priority"
            value={priority}
            options={PRIORITY_OPTIONS}
            onChange={setPriority}
          />
        </div>

        <div className="flex flex-col my-1">
          <Input
            name="task-due-date"
            label="Due date (optional)"
            value={dueDate}
            type="date"
            handleChange={(e) => setDueDate(e.target.value)}
            className="my-0"
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <div className={`flex gap-0.5 ${SEGMENT_TRACK_CLASS}`} role="group" aria-label="Due date presets">
              {[
                { label: "Today", value: addDays(0) },
                { label: "Tomorrow", value: addDays(1) },
                { label: "+1 Week", value: addDays(7) },
              ].map((preset) => (
                <Button variant="segment"
                  key={preset.label}
                  aria-pressed={dueDate === preset.value}
                  onClick={() => setDueDate(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {dueDate && (
              <Button variant="small" onClick={() => setDueDate("")}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <Input
          name="task-tags"
          label="Tags"
          value={tagsInput}
          handleChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. work urgent"
          className="my-0"
        />

        <div className="rounded-xl bg-fill p-3 mt-1">
          <div className="mb-1 text-ui-footnote font-medium text-ink-muted dark:text-stone">Preview</div>
          <div className="font-mono text-ui-footnote break-words text-ink-light dark:text-ink-dark selection:bg-sage/20">
            {preview || "- [ ] "}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} isDisabled={!title.trim()}>
            Insert
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
