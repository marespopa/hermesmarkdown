// A task's status lives in its box character and nowhere else:
// `- [ ]` to do, `- [/]` in progress, `- [!]` on hold, `- [x]` done,
// `- [-]` cancelled. Tags on the line never change the status.

export type TaskStatus = "todo" | "prog" | "hold" | "done" | "cancelled";

export const TASK_STATUSES: TaskStatus[] = ["todo", "prog", "hold", "done", "cancelled"];

export const TASK_STATUS_CHAR: Record<TaskStatus, string> = {
  todo: " ",
  prog: "/",
  hold: "!",
  done: "x",
  cancelled: "-",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  prog: "In Progress",
  hold: "On Hold",
  done: "Done",
  cancelled: "Cancelled",
};

// Every character a task box may hold, for regex character classes.
export const TASK_BOX_CHARS = " xX/!-";

export function taskStatusFromChar(char: string): TaskStatus {
  switch (char) {
    case "x":
    case "X":
      return "done";
    case "/":
      return "prog";
    case "!":
      return "hold";
    case "-":
      return "cancelled";
    default:
      return "todo";
  }
}

// Done and cancelled tasks need nothing more; the rest are still open.
export const isOpenStatus = (status: TaskStatus) => status !== "done" && status !== "cancelled";

// A click on the box: an open task is done, a closed one opens again.
export const toggledStatus = (status: TaskStatus): TaskStatus => (isOpenStatus(status) ? "done" : "todo");

// Mod-Enter in the editor: to do → in progress → done → to do. On hold and
// cancelled re-enter the cycle at in progress and to do.
export function cycledStatus(status: TaskStatus): TaskStatus {
  if (status === "todo" || status === "hold") return "prog";
  if (status === "prog") return "done";
  return "todo";
}
