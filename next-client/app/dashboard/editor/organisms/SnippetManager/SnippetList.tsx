"use client";

import { UserSnippet } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";

type Props = {
  snippets: UserSnippet[];
  onEdit: (snippet: UserSnippet) => void;
  onDelete: (id: string) => void;
};

export default function SnippetList({ snippets, onEdit, onDelete }: Props) {
  if (snippets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">
          No snippets yet. Create your first one!
        </p>
      </div>
    );
  }

  // Group snippets by category
  const groupedSnippets = snippets.reduce(
    (acc, snippet) => {
      if (!acc[snippet.category]) {
        acc[snippet.category] = [];
      }
      acc[snippet.category].push(snippet);
      return acc;
    },
    {} as Record<string, UserSnippet[]>,
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedSnippets).map(([category, categorySnippets]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3 px-2">
            {category}
          </h3>
          <div className="space-y-2">
            {categorySnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <code className="text-sm font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {snippet.key}
                      </code>
                      <span className="text-zinc-900 dark:text-white font-medium">
                        {snippet.label}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      {snippet.description}
                    </p>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      Created: {new Date(snippet.createdAt).toLocaleDateString()}
                      {snippet.createdAt !== snippet.updatedAt && (
                        <>
                          {" "}
                          • Updated:{" "}
                          {new Date(snippet.updatedAt).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="tertiary"
                      onClick={() => onEdit(snippet)}
                      styles="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="tertiary"
                      onClick={() => onDelete(snippet.id)}
                      styles="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

