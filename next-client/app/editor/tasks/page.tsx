"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { HiOutlineArrowLeft } from "react-icons/hi";
import { atom_pendingScrollTarget } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import TasksList from "./components/TasksList";

export default function TasksPage() {
  const router = useRouter();
  const { openFile } = useFileSystem();
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);

  return (
    <div className="fixed inset-0 flex flex-col font-sans overflow-hidden overscroll-none bg-paper-pale dark:bg-paper-dark text-ink-light dark:text-ink-dark selection:bg-sage/10">
      <header className="shrink-0 border-b border-beige/70 dark:border-paper-dark px-5 sm:px-8 py-4">
        <button
          type="button"
          onClick={() => router.push("/editor")}
          title="Back to editor"
          className="inline-flex items-center gap-1.5 text-ui-footnote font-medium text-stone hover:text-ink-light dark:hover:text-ink-dark transition-colors group focus:outline-none"
        >
          <HiOutlineArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Editor
        </button>
      </header>
      <main className="flex-1 min-h-0 mx-auto w-full max-w-5xl px-4 sm:px-8 py-5">
        <TasksList
          onFileSelect={(handle, path, line) => {
            openFile(handle, path);
            setPendingScrollTarget({ path, line });
            router.push("/editor");
          }}
        />
      </main>
    </div>
  );
}
