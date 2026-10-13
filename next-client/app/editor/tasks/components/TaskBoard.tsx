"use client";

import React from "react";
import type { DisplayTask } from "@/app/atoms/task-atoms";
import type { TaskStatus } from "@/app/utils/task-status";
import type { TaskSectionData } from "../task-views";
import TaskSection from "./TaskSection";

// The Tasks page's Board: one column per status (To Do, In Progress, On
// Hold, Done; buildBoardColumns), each card a TaskRow. Dragging a card to
// another column sets that status; the ring, its menu and the swipe work as
// in the lists. On a narrow screen the columns scroll sideways, a column at
// a time.
export default function TaskBoard({
  columns,
  renderCard,
  onMove,
}: {
  columns: TaskSectionData<DisplayTask>[];
  renderCard: (task: DisplayTask) => React.ReactNode;
  onMove: (task: DisplayTask, status: TaskStatus) => void;
}) {
  const [dragged, setDragged] = React.useState<DisplayTask | null>(null);
  const [over, setOver] = React.useState<TaskStatus | null>(null);
  const endDrag = () => {
    setDragged(null);
    setOver(null);
  };

  return (
    <div className="grid h-full min-h-0 auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto px-2.5 pb-3 pt-1 snap-x snap-mandatory custom-scrollbar">
      {columns.map((column) => {
        const status = column.status!;
        const target = dragged !== null && dragged.status !== status;
        return (
          <div
            key={column.id}
            data-testid={`board-column-${status}`}
            onDragOver={(e) => {
              if (!target) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((s) => (s === status ? null : s));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const task = dragged;
              endDrag();
              if (task && task.status !== status) onMove(task, status);
            }}
            className={`flex min-h-0 snap-start flex-col rounded-2xl pt-2.5 transition-colors ${
              over === status ? "bg-sage/10 ring-1 ring-sage/40" : "bg-paper-softgray/50 dark:bg-paper-dark-surface/40"
            }`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5 custom-scrollbar">
              <TaskSection title={column.title} count={column.tasks.length} status={status}>
                {column.tasks.length === 0 ? (
                  <div className="px-2.5 py-4 text-center text-ui-footnote italic text-fg-faint">
                    {target ? "Drop here" : "No tasks"}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {column.tasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", task.id);
                          setDragged(task);
                        }}
                        onDragEnd={endDrag}
                        className={`cursor-grab rounded-xl border border-edge-subtle bg-paper-light shadow-sm active:cursor-grabbing dark:bg-paper-dark ${
                          dragged?.id === task.id ? "opacity-50" : ""
                        }`}
                      >
                        {renderCard(task)}
                      </div>
                    ))}
                  </div>
                )}
              </TaskSection>
            </div>
          </div>
        );
      })}
    </div>
  );
}
