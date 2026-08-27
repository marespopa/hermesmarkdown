export type TaskStatus = "todo" | "prog" | "hold" | "done";
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
  if (!cleanTitle) return "- [ ] ";

  const due = dueDate.trim();
  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index);

  const segments = [`- [ ] ${cleanTitle}`];

  if (due) {
    segments.push(`@due(${due})`);
  }

  if (priority) {
    segments.push(`@priority(${priority})`);
  }

  const statusTag = `#${status}`;
  segments.push(statusTag);

  for (const tag of normalizedTags) {
    segments.push(`#${tag}`);
  }

  return segments.join(" ");
}
