import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { recordPerfAfterPaint } from "@/app/utils/perf/perf-metrics";

// Dev only (PerfReadout): keystroke → the next paint, from the input
// event's own time stamp, so the wait before the handler ran counts too.
// Production builds get no handler at all.
export const keystrokeLatency: Extension =
  process.env.NODE_ENV === "production"
    ? []
    : EditorView.domEventHandlers({
        beforeinput: (event) => {
          recordPerfAfterPaint("keystroke", event.timeStamp);
          return false;
        },
      });
