// Loading skeleton for the editor
const EditorSkeleton = () => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-pulse">
      <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
        <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
        <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
        <div className="ml-2 h-4 w-32 bg-neutral-300 dark:bg-neutral-600 rounded"></div>
      </div>
      <div className="h-[400px] p-4 space-y-3">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
      </div>
      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-40"></div>
      </div>
    </div>
  );
};

export default EditorSkeleton;
