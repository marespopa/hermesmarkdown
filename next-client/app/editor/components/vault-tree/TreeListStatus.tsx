"use client";

interface TreeListStatusProps {
  // Nothing listed (no rows, nothing being created).
  isEmpty: boolean;
  isIndexing: boolean;
  isSearchActive: boolean;
}

// Under the Files list: "Scanning vault…" or the empty-state text while
// nothing is listed, and "Still scanning vault…" below rows that are.
export function TreeListStatus({ isEmpty, isIndexing, isSearchActive }: TreeListStatusProps) {
  if (isEmpty) {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
        {isIndexing ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-edge border-t-sage dark:border-t-sage animate-spin" />
            <p className="opacity-40 text-ui-caption italic">
              Scanning vault…
            </p>
          </>
        ) : (
          <p className="opacity-30 text-ui-footnote font-medium italic">
            {isSearchActive ? "No file found" : "No files yet"}
          </p>
        )}
      </div>
    );
  }
  if (!isIndexing) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="w-3 h-3 rounded-full border-2 border-edge border-t-sage dark:border-t-sage animate-spin" />
      <p className="opacity-40 text-ui-caption italic">Still scanning vault…</p>
    </div>
  );
}
