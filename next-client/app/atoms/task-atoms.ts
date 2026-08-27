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

// All distinct custom tags across every task, for the filter chip list.
export const atom_allTaskTags = atom<string[]>((get) => {
  const tasks = get(atom_allTasks);
  const tags = new Set<string>();
  for (const t of tasks) for (const tag of t.tags) tags.add(tag);
  return Array.from(tags).sort();
});

export type TaskDueFilter = "all" | "overdue" | "today" | "upcoming" | "none";

// Transient filter state for the Tasks sidebar — not persisted, since it's
// meant to help focus on the current session rather than survive as a
// hidden, easily-forgotten leftover filter next time the app opens.
export const atom_taskSearchQuery = atom<string>("");
export const atom_taskTagFilter = atom<string[]>([]);
export const atom_taskDueFilter = atom<TaskDueFilter>("all");

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const atom_filteredTasks = atom<TaskItem[]>((get) => {
  const tasks = get(atom_allTasks);
  const query = get(atom_taskSearchQuery).trim().toLowerCase();
  const tagFilter = get(atom_taskTagFilter);
  const dueFilter = get(atom_taskDueFilter);
  const today = todayStr();

  return tasks.filter((t) => {
    if (query && !t.text.toLowerCase().includes(query)) return false;
    if (tagFilter.length > 0 && !tagFilter.every((tag) => t.tags.includes(tag))) return false;
    if (dueFilter === "none") return !t.dueDate;
    if (dueFilter === "overdue") return !!t.dueDate && t.dueDate < today && !t.checked;
    if (dueFilter === "today") return t.dueDate === today;
    if (dueFilter === "upcoming") return !!t.dueDate && t.dueDate > today;
    return true;
  });
});

