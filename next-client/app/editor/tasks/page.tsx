"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { atom_pendingScrollTarget } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import TasksList from "./components/TasksList";
import ShellPage from "../components/ShellPage";
import { editorFileHref } from "../utils/editor-url";

export default function TasksPage() {
  const router = useRouter();
  const { openFile } = useFileSystem();
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);

  return (
    <ShellPage title="Tasks" help={{ href: "/documentation#tasks-page", label: "How to use the Tasks page" }}>
      <main className="flex-1 min-h-0 mx-auto w-full max-w-5xl px-4 sm:px-8 py-5">
        <TasksList
          onFileSelect={(handle, path, line) => {
            openFile(handle, path);
            setPendingScrollTarget({ path, line });
            router.push(editorFileHref(path));
          }}
        />
      </main>
    </ShellPage>
  );
}
