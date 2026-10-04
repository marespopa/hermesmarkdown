import { atom } from "jotai";
import { atom_fileMetadata } from "./metadata";
import { atom_privacyLevel } from "./privacy-atoms";
import { TaskItem } from "../utils/taskExtractor";
import { isSensitiveFrontmatter } from "../utils/note-privacy";
import { maskTask, normalizePrivacyLevel } from "../utils/note-display";
import { isTemplatePath } from "../utils/templates/template-registry";
import { atom_templatesFolder } from "./template-atoms";

export const atom_allTasks = atom<TaskItem[]>((get) => {
  const meta = get(atom_fileMetadata);
  const templatesFolder = get(atom_templatesFolder).folder;
  const out: TaskItem[] = [];
  for (const file of Object.values(meta)) {
    // Template files hold placeholder tasks (`- [ ] {{prompt:Task}}`), not real ones.
    if (file.path.startsWith(".hermes/") || isTemplatePath(file.path, templatesFolder)) continue;
    for (const t of file.tasks || []) out.push(t);
  }
  return out;
});

export type DisplayTask = TaskItem & { isMasked: boolean };

// Tasks as listings show them (Tasks page, palette `!` scope). Task text is
// note content, so tasks from sensitive notes are masked (text and tags), or
// left out entirely in "hidden" Privacy Mode. atom_allTasks stays the raw list
// for writeback.
export const atom_visibleTasks = atom<DisplayTask[]>((get) => {
  const meta = get(atom_fileMetadata);
  const level = normalizePrivacyLevel(get(atom_privacyLevel));
  const templatesFolder = get(atom_templatesFolder).folder;
  const out: DisplayTask[] = [];
  for (const file of Object.values(meta)) {
    if (file.path.startsWith(".hermes/") || isTemplatePath(file.path, templatesFolder)) continue;
    const sensitive = isSensitiveFrontmatter(file.frontmatter);
    if (sensitive && level === "hidden") continue;
    for (const t of file.tasks || []) {
      out.push(sensitive ? { ...maskTask(t), isMasked: true } : { ...t, isMasked: false });
    }
  }
  return out;
});

// All distinct custom tags across every visible task, for the filter chip list.
export const atom_allTaskTags = atom<string[]>((get) => {
  const tasks = get(atom_visibleTasks);
  const tags = new Set<string>();
  for (const t of tasks) for (const tag of t.tags) tags.add(tag);
  return Array.from(tags).sort();
});

export type TaskDueFilter = "all" | "overdue" | "today" | "upcoming" | "none";

// Transient filter state for the Tasks page — not persisted, since it's
// meant to help focus on the current session rather than survive as a
// hidden, easily-forgotten leftover filter next time the app opens.
export const atom_taskSearchQuery = atom<string>("");
export const atom_taskTagFilter = atom<string[]>([]);
export const atom_taskDueFilter = atom<TaskDueFilter>("all");

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const atom_filteredTasks = atom<DisplayTask[]>((get) => {
  const tasks = get(atom_visibleTasks);
  const query = get(atom_taskSearchQuery).trim().toLowerCase();
  const tagFilter = get(atom_taskTagFilter);
  const dueFilter = get(atom_taskDueFilter);
  const today = todayStr();

  return tasks.filter((t) => {
    // A masked task never matches by text or tag.
    if (t.isMasked && (query || tagFilter.length > 0)) return false;
    if (query && !t.text.toLowerCase().includes(query)) return false;
    if (tagFilter.length > 0 && !tagFilter.every((tag) => t.tags.includes(tag))) return false;
    if (dueFilter === "none") return !t.dueDate;
    if (dueFilter === "overdue") return !!t.dueDate && t.dueDate < today && !t.checked;
    if (dueFilter === "today") return t.dueDate === today;
    if (dueFilter === "upcoming") return !!t.dueDate && t.dueDate > today;
    return true;
  });
});
