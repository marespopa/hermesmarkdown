"use client";

import { useCallback, useState } from "react";
import { useAtom } from "jotai";
import { atom_userSnippets, UserSnippet } from "@/app/atoms/atoms";
import SnippetForm from "./SnippetForm";
import SnippetList from "./SnippetList";
import Button from "@/app/components/Button";
import { FaTimes, FaPlus } from "react-icons/fa";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SnippetManagerModal({ isOpen, onClose }: Props) {
  const [userSnippets, setUserSnippets] = useAtom(atom_userSnippets);
  const [editingSnippet, setEditingSnippet] = useState<UserSnippet | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleAddNew = useCallback(() => {
    setEditingSnippet(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((snippet: UserSnippet) => {
    setEditingSnippet(snippet);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this snippet?")) {
      setUserSnippets((prev) => prev.filter((s) => s.id !== id));
    }
  }, [setUserSnippets]);

  const handleSaveSnippet = useCallback(
    (snippet: Omit<UserSnippet, "id" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      if (editingSnippet) {
        // Update existing snippet
        setUserSnippets((prev) =>
          prev.map((s) =>
            s.id === editingSnippet.id
              ? {
                  ...snippet,
                  id: editingSnippet.id,
                  createdAt: editingSnippet.createdAt,
                  updatedAt: now,
                }
              : s,
          ),
        );
      } else {
        // Create new snippet
        const newSnippet: UserSnippet = {
          ...snippet,
          id: `snippet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        setUserSnippets((prev) => [...prev, newSnippet]);
      }
      setShowForm(false);
      setEditingSnippet(null);
    },
    [editingSnippet, setUserSnippets],
  );

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingSnippet(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Snippet Manager
          </h2>
          <Button variant="icon" onClick={onClose} aria-label="Close">
            <FaTimes />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <SnippetForm
              snippet={editingSnippet}
              onSave={handleSaveSnippet}
              onCancel={handleCancelForm}
            />
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleAddNew}
                styles="mb-4"
              >
                <FaPlus size={12} />
                New Snippet
              </Button>
              <SnippetList
                snippets={userSnippets}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

