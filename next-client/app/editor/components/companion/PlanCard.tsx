"use client";

import React from "react";
import { HiOutlineCheck } from "react-icons/hi";
import { DelayedSpinner } from "./ToolActivityChip";
import type { PlanStep } from "./tools/search-tools";

// The companion's plan (update_plan) as a checklist: done steps checked, the
// step in progress with the delayed spinner, the rest quiet. One card per
// reply, kept up to date as the plan changes.
export default function PlanCard({ steps }: { steps: PlanStep[] }) {
  const done = steps.filter((step) => step.status === "done").length;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-edge-subtle px-3 py-2">
      <p className="text-ui-caption text-fg-faint">Plan · {done} of {steps.length} done</p>
      <ul className="flex flex-col gap-0.5">
        {steps.map((step, i) => (
          <li key={i} className={`flex items-start gap-1.5 text-ui-caption ${step.status === "pending" ? "text-fg-faint" : step.status === "done" ? "text-fg-muted" : "text-fg"}`} data-status={step.status}>
            <span aria-hidden="true" className="mt-0.5 flex w-3 shrink-0 justify-center">
              {step.status === "done" ? <HiOutlineCheck size={12} /> : step.status === "in_progress" ? <DelayedSpinner /> : <span className="h-1.5 w-1.5 rounded-full bg-fg-faint" />}
            </span>
            <span className="min-w-0">{step.text}<span className="sr-only"> ({step.status.replace("_", " ")})</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
