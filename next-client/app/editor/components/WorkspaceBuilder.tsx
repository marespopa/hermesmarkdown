"use client";

import React, { useState, useEffect } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
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
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-xl">
      <div className="flex flex-col max-h-[85vh]">
        <div className="space-y-1 mb-4 px-1 shrink-0">
          <h3 className="text-ui-title-3 font-semibold tracking-tight">
            {editingWorkspace ? "Edit Workspace" : "New Workspace"}
          </h3>
          <p className="text-ui-footnote text-neutral-500 dark:text-neutral-400 font-medium">Smart Folder Configuration</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-4 space-y-6">
          <Input
            name="workspace-name"
            label="Workspace Name"
            value={name}
            handleChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work Projects, Daily Logs..."
            autoFocus
            className="my-0"
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-ui-footnote font-medium text-neutral-500 dark:text-neutral-400">Filter Rules</label>
              <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-0.5">
                {(["AND", "OR"] as const).map((op) => (
                  <Button
                    key={op}
                    variant="bare"
                    onClick={() => setOperator(op)}
                    className={`px-4 py-1.5 text-ui-footnote font-bold rounded-md transition-all ${
                      operator === op
                        ? "bg-paper-light dark:bg-neutral-800 shadow-sm text-sage dark:text-sage"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    }`}
                  >
                    {op}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-start sm:items-center bg-neutral-50 dark:bg-neutral-900/50 p-4 sm:p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 transition-all">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select
                      value={rule.field}
                      onChange={(e) => updateRule(idx, { field: e.target.value, condition: CONDITIONS[e.target.value][0].value })}
                      className="flex-1 sm:w-28 bg-paper-light dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-2 text-ui-footnote font-medium outline-none focus:ring-2 focus:ring-sage/50"
                    >
                      {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>

                    <select
                      value={rule.condition}
                      onChange={(e) => updateRule(idx, { condition: e.target.value as any })}
                      className="flex-1 sm:w-32 bg-paper-light dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-2 text-ui-footnote font-medium outline-none focus:ring-2 focus:ring-sage/50"
                    >
                      {CONDITIONS[rule.field].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Input
                      name={`rule-value-${idx}`}
                      value={rule.value}
                      handleChange={(e) => updateRule(idx, { value: e.target.value })}
                      placeholder="Value..."
                      className="flex-1 my-0"
                    />

                    <Button
                      variant="icon"
                      onClick={() => removeRule(idx)}
                      className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                      title="Remove rule"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outlined"
                onClick={addRule}
                className="w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400 hover:text-sage hover:border-sage/50 transition-all flex items-center justify-center gap-2 text-ui-footnote font-medium"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Rule
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isDisabled={!name.trim() || rules.length === 0}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {editingWorkspace ? "Update Workspace" : "Create Workspace"}
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
