"use client";

import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_customWorkspaces, CustomWorkspace } from "@/app/atoms/metadata";
import { QueryRule } from "@/app/utils/queryEngine";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCollection } from "react-icons/hi";
import { v4 as uuidv4 } from "uuid";

interface WorkspaceBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  editingWorkspace: CustomWorkspace | null;
}

interface BuilderRule extends QueryRule {
  id: string;
}

const FIELDS = [
  { label: "Tags", value: "tags" },
  { label: "Modified At", value: "modifiedAt" },
  { label: "Word Count", value: "wordCount" },
  { label: "Backlinks", value: "backlinks" },
  { label: "Frontmatter", value: "frontmatter." },
];

const CONDITIONS: Record<string, { label: string; value: string }[]> = {
  tags: [
    { label: "Includes", value: "includes" },
    { label: "Not Includes", value: "not_includes" },
  ],
  modifiedAt: [
    { label: "Before Days", value: "before-days" },
    { label: "After Days", value: "after-days" },
  ],
  wordCount: [
    { label: "Greater Than", value: "greater_than" },
    { label: "Less Than", value: "less_than" },
    { label: "Equals", value: "equals" },
  ],
  backlinks: [
    { label: "Greater Than", value: "greater_than" },
    { label: "Less Than", value: "less_than" },
    { label: "Equals", value: "equals" },
  ],
  "frontmatter.": [
    { label: "Equals", value: "equals" },
    { label: "Exists", value: "exists" },
    { label: "Not Exists", value: "not_exists" },
    { label: "Contains", value: "contains" },
  ],
};

export default function WorkspaceBuilder({ isOpen, onClose, editingWorkspace }: WorkspaceBuilderProps) {
  const [, setCustomWorkspaces] = useAtom(atom_customWorkspaces);
  const [name, setName] = useState("");
  const [operator, setOperator] = useState<"AND" | "OR">("AND");
  const [rules, setRules] = useState<BuilderRule[]>([]);

  useEffect(() => {
    if (editingWorkspace) {
      setName(editingWorkspace.name);
      setOperator(editingWorkspace.query.operator);
      setRules(editingWorkspace.query.rules.map(r => ({ ...r, id: uuidv4() })) as BuilderRule[]);
    } else {
      setName("");
      setOperator("AND");
      setRules([{ id: uuidv4(), field: "tags", condition: "includes", value: "" }]);
    }
  }, [editingWorkspace, isOpen]);

  const addRule = () => {
    setRules([...rules, { id: uuidv4(), field: "tags", condition: "includes", value: "" }]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<BuilderRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } as BuilderRule : r));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const newWorkspace: CustomWorkspace = {
      id: editingWorkspace?.id || uuidv4(),
      name,
      icon: "collection",
      query: {
        operator,
        rules: rules.map(({ field, condition, value }) => ({ 
          field, 
          condition: condition as any, 
          value 
        })),
      },
    };

    setCustomWorkspaces(prev => {
      if (editingWorkspace) {
        return prev.map(w => w.id === editingWorkspace.id ? newWorkspace : w);
      }
      return [...prev, newWorkspace];
    });

    onClose();
  };

  return (
    <DialogModal isOpened={isOpen} onClose={onClose}>
      <div className="space-y-6 max-w-lg w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
            <HiOutlineCollection size={20} />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">
            {editingWorkspace ? "Edit Workspace" : "New Smart Workspace"}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1.5 block">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Active Projects"
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-500 transition-all outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                Query Rules
              </label>
              <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md">
                {(["AND", "OR"] as const).map((op) => (
                  <button
                    key={op}
                    onClick={() => setOperator(op)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                      operator === op
                        ? "bg-white dark:bg-neutral-700 shadow-sm"
                        : "opacity-40 hover:opacity-100"
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                  <select
                    value={rule.field.startsWith("frontmatter.") ? "frontmatter." : rule.field}
                    onChange={(e) => {
                      const field = e.target.value;
                      const defaultCond = CONDITIONS[field][0].value;
                      updateRule(rule.id, { 
                        field: field === "frontmatter." ? "frontmatter.key" : field, 
                        condition: defaultCond as any
                      });
                    }}
                    className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-2 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none w-32"
                  >
                    {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>

                  <select
                    value={rule.condition}
                    onChange={(e) => updateRule(rule.id, { condition: e.target.value as any })}
                    className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-2 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none w-32"
                  >
                    {CONDITIONS[rule.field.startsWith("frontmatter.") ? "frontmatter." : rule.field]?.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>

                  <div className="flex-1 flex gap-2">
                    {rule.field.startsWith("frontmatter.") && (
                      <input
                        type="text"
                        placeholder="Key"
                        value={rule.field.replace("frontmatter.", "")}
                        onChange={(e) => updateRule(rule.id, { field: `frontmatter.${e.target.value}` })}
                        className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-2 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none w-20"
                      />
                    )}
                    {rule.condition !== "exists" && rule.condition !== "not_exists" && (
                      <input
                        type="text"
                        placeholder="Value"
                        value={rule.value}
                        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                        className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-2 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    )}
                  </div>

                  <Button
                    variant="icon"
                    className="w-8 h-8 opacity-30 hover:opacity-100 hover:text-red-500"
                    onClick={() => removeRule(rule.id)}
                  >
                    <HiOutlineTrash size={14} />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="bare"
              onClick={addRule}
              className="mt-3 text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100 flex items-center gap-1.5"
            >
              <HiOutlinePlus size={14} />
              Add Rule
            </Button>
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
            {editingWorkspace ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
