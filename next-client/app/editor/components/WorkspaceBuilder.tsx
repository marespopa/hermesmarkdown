"use client";

import React, { useState, useEffect } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import { QueryRule } from "@/app/utils/queryEngine";
import { useAtom } from "jotai";
import { atom_customWorkspaces, CustomWorkspace } from "@/app/atoms/metadata";

interface WorkspaceBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  editingWorkspace?: CustomWorkspace | null;
}

const FIELDS = [
  { label: "Filename", value: "name" },
  { label: "Tags", value: "tags" },
  { label: "Modified Date", value: "modifiedAt" },
  { label: "Word Count", value: "wordCount" },
];

const CONDITIONS: Record<string, { label: string; value: QueryRule["condition"]; type: "text" | "number" | "date" | "none" }[]> = {
  name: [
    { label: "Contains", value: "contains", type: "text" },
    { label: "Starts with", value: "starts_with", type: "text" },
    { label: "Ends with", value: "ends_with", type: "text" },
    { label: "Is exactly", value: "equals", type: "text" },
  ],
  tags: [
    { label: "Contains tag", value: "includes", type: "text" },
    { label: "Does not contain tag", value: "not_includes", type: "text" },
    { label: "Is empty", value: "not_exists", type: "none" },
  ],
  modifiedAt: [
    { label: "Within last days", value: "after-days", type: "number" },
    { label: "Older than days", value: "before-days", type: "number" },
    { label: "Before date", value: "before", type: "date" },
    { label: "After date", value: "after", type: "date" },
  ],
  wordCount: [
    { label: "Greater than", value: "greater_than", type: "number" },
    { label: "Less than", value: "less_than", type: "number" },
    { label: "Between", value: "between", type: "number" },
  ],
};

export default function WorkspaceBuilder({ isOpen, onClose, editingWorkspace }: WorkspaceBuilderProps) {
  const [, setCustomWorkspaces] = useAtom(atom_customWorkspaces);
  const [name, setName] = useState("");
  const [operator, setOperator] = useState<"AND" | "OR">("AND");
  const [rules, setRules] = useState<QueryRule[]>([]);

  useEffect(() => {
    if (editingWorkspace) {
      setName(editingWorkspace.name);
      setOperator(editingWorkspace.query.operator);
      setRules([...editingWorkspace.query.rules]);
    } else {
      setName("");
      setOperator("AND");
      setRules([{ field: "name", condition: "contains", value: "" }]);
    }
  }, [editingWorkspace, isOpen]);

  const addRule = () => {
    setRules([...rules, { field: "name", condition: "contains", value: "" }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<QueryRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const handleSave = () => {
    const newWorkspace: CustomWorkspace = {
      id: editingWorkspace?.id || crypto.randomUUID(),
      name,
      query: { operator, rules },
      icon: "Collection",
    };

    setCustomWorkspaces((prev) => {
      if (editingWorkspace) {
        return prev.map((w) => (w.id === editingWorkspace.id ? newWorkspace : w));
      }
      return [...prev, newWorkspace];
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <DialogModal isOpened={isOpen} onClose={onClose}>
      <div className="space-y-4 p-1">
        <h3 className="text-lg font-semibold">{editingWorkspace ? "Edit Workspace" : "New Workspace"}</h3>
        <div className="space-y-1">
          <label className="text-[10px] font-medium uppercase text-neutral-500">Workspace Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Work Projects, Daily Logs..."
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium uppercase text-neutral-500">Filter Rules</label>
            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded p-0.5">
              {(["AND", "OR"] as const).map((op) => (
                <button
                  key={op}
                  onClick={() => setOperator(op)}
                  className={`px-3 py-1 text-[10px] font-medium rounded ${
                    operator === op
                      ? "bg-white dark:bg-neutral-800 shadow-sm text-blue-600 dark:text-blue-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(idx, { field: e.target.value, condition: CONDITIONS[e.target.value][0].value })}
                  className="bg-transparent text-[11px] outline-none border-none focus:ring-0 w-28"
                >
                  {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                <select
                  value={rule.condition}
                  onChange={(e) => updateRule(idx, { condition: e.target.value as any })}
                  className="bg-transparent text-[11px] outline-none border-none focus:ring-0 w-32"
                >
                  {CONDITIONS[rule.field].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>

                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => updateRule(idx, { value: e.target.value })}
                  placeholder="Value..."
                  className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
                />

                <button
                  onClick={() => removeRule(idx)}
                  className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              onClick={addRule}
              className="w-full py-2 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-400 hover:text-blue-500 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 text-[11px] font-medium"
            >
              <HiOutlinePlus className="w-3 h-3" />
              Add Rule
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isDisabled={!name.trim() || rules.length === 0}
          >
            {editingWorkspace ? "Update Workspace" : "Create Workspace"}
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
