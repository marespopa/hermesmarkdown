import { atom } from "jotai";
import { atom_fileMetadata } from "./metadata";
import { TaskItem } from "../utils/taskExtractor";

export const atom_allTasks = atom<TaskItem[]>((get) => {
  const meta = get(atom_fileMetadata);
  const out: TaskItem[] = [];
  for (const file of Object.values(meta)) {
    if (file.path.startsWith(".hermes/")) continue;
    for (const t of file.tasks || []) out.push(t);
  }
  return out;
});
