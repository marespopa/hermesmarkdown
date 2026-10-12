import { TASK_STATUS_CHAR, type TaskStatus } from "@/app/utils/task-status";

export type { TaskStatus };
export type TaskPriority = "high" | "med" | "low";

export interface TaskTemplateValues {
  title: string;
  status: TaskStatus;
  dueDate: string;
  priority?: TaskPriority;
  tags: string[];
}

export function buildTaskText({ title, status, dueDate, priority, tags }: TaskTemplateValues): string {
  const cleanTitle = title.trim();
  const box = `- [${TASK_STATUS_CHAR[status]}]`;
  if (!cleanTitle) return `${box} `;

  const due = dueDate.trim();
  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index);

  const segments = [`${box} ${cleanTitle}`];

  if (due) {
    segments.push(`@due(${due})`);
  }

  if (priority) {
    segments.push(`@priority(${priority})`);
  }

  for (const tag of normalizedTags) {
    segments.push(`#${tag}`);
  }

  return segments.join(" ");
}
