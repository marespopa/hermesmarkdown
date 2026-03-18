"use client";

import { useCallback, useState } from "react";
import { UserSnippet } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";

type Props = {
  snippet: UserSnippet | null;
  onSave: (snippet: Omit<UserSnippet, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
};

const CATEGORIES = [
  "Foundation",
  "Engineering",
  "Architecture",
  "Transformation",
  "Operations",
  "Utility",
  "Custom",
];

export default function SnippetForm({ snippet, onSave, onCancel }: Props) {
  const [key, setKey] = useState(snippet?.key || "");
  const [label, setLabel] = useState(snippet?.label || "");
  const [description, setDescription] = useState(snippet?.description || "");
  const [content, setContent] = useState(snippet?.content || "");
  const [category, setCategory] = useState(snippet?.category || "Custom");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!key.trim()) {
      newErrors.key = "Trigger key is required";
    } else if (!key.startsWith("/")) {
      newErrors.key = "Trigger key must start with /";
    } else if (key.length < 2) {
      newErrors.key = "Trigger key must be at least 2 characters";
    } else if (!/^\/[a-zA-Z0-9\-_]+$/.test(key)) {
      newErrors.key = "Trigger key can only contain letters, numbers, hyphens, and underscores";
    }

    if (!label.trim()) {
      newErrors.label = "Label is required";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [key, label, description, content]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;

      onSave({
        key: key.trim(),
        label: label.trim(),
        description: description.trim(),
        content: content.trim(),
        category,
      });
    },
    [key, label, description, content, category, onSave, validateForm],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Trigger Key */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
          Trigger Key <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="/mysnippet"
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.key
              ? "border-red-500"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
        />
        {errors.key && (
          <p className="text-red-500 text-sm mt-1">{errors.key}</p>
        )}
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
          Must start with / and contain only letters, numbers, hyphens, underscores
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
          Label <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Display name"
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.label
              ? "border-red-500"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
        />
        {errors.label && (
          <p className="text-red-500 text-sm mt-1">{errors.label}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of this snippet"
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description
              ? "border-red-500"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Snippet template content"
          rows={6}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
            errors.content
              ? "border-red-500"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
        />
        {errors.content && (
          <p className="text-red-500 text-sm mt-1">{errors.content}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          variant="outlined"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
        >
          {snippet ? "Update Snippet" : "Create Snippet"}
        </Button>
      </div>
    </form>
  );
}

