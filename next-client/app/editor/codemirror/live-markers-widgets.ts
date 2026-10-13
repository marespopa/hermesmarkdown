import type { EditorView } from "@codemirror/view";
import { cycledStatus, taskStatusFromChar } from "@/app/utils/task-status";
import { statusLineEdits } from "@/app/utils/task-line";

// Moves the task whose marker starts at `markerFrom` on in the Mod-Enter cycle
// (to do → in progress → done → to do; on hold resumes, cancelled reopens),
// with its @started/@done stamps (task-line.ts).
export function cycleTaskBox(view: EditorView, markerFrom: number): boolean {
  const line = view.state.doc.lineAt(markerFrom);
  const bracket = line.text.indexOf("[", markerFrom - line.from);
  if (bracket < 0) return false;
  const current = line.text.charAt(bracket + 1);
  const edits = statusLineEdits(line.text, cycledStatus(taskStatusFromChar(current)));
  if (!edits) return false;
  view.dispatch({
    changes: edits.map((edit) => ({ from: line.from + edit.from, to: line.from + edit.to, insert: edit.insert })),
    userEvent: "input.outline.task",
  });
  return true;
}
