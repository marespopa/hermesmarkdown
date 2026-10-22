"use client";

import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Panel, Group, Separator } from "react-resizable-panels";
import { WorkspaceContainer, PanelLeaf as PanelLeafType } from "@/app/types/workspace";
import { atom_activePaneId } from "@/app/atoms/workspace-atoms";
import { atom_setSplitSizes } from "@/app/atoms/layout-actions";
import { useScrollLock } from "../hooks/use-scroll-lock";
import PaneLeaf from "./PaneLeaf";

interface WorkspaceSplitterProps {
  node: WorkspaceContainer | PanelLeafType;
}

export default function WorkspaceSplitter({ node }: WorkspaceSplitterProps) {
  if ("type" in node) {
    // It's a PanelLeaf
    return <PaneLeaf leaf={node} />;
  }
  return <SplitGroup node={node} />;
}

// One split. A component of its own because it runs hooks (the persisted
// sizes and the scroll lock), which the recursive function above can't after
// its early return.
function SplitGroup({ node }: { node: WorkspaceContainer }) {
  const setSplitSizes = useSetAtom(atom_setSplitSizes);
  const activePaneId = useAtomValue(atom_activePaneId);
  const refA = React.useRef<HTMLDivElement>(null);
  const refB = React.useRef<HTMLDivElement>(null);
  const [childA, childB] = node.children;
  const leafA = childA && "type" in childA ? childA : null;
  const leafB = childB && "type" in childB ? childB : null;
  const bothLeaves = node.children.length === 2 && !!leafA && !!leafB;

  useScrollLock(refA, refB, {
    enabled: !!node.scrollLock && bothLeaves,
    paths: [leafA?.activeFilePath, leafB?.activeFilePath],
    activeIndex: leafB && activePaneId === leafB.id ? 1 : 0,
  });

  return (
    <Group
      id={node.id}
      orientation={node.direction}
      // Fires once a divider drag ends: the new percentages persist.
      onLayoutChanged={(layout) =>
        setSplitSizes({
          containerId: node.id,
          sizes: node.children.map((child) => layout[child.id] ?? 0),
        })
      }
    >
      {node.children.map((child, index) => (
        <React.Fragment key={child.id}>
          {/* Sizes are strings: a bare number means pixels in v4. */}
          <Panel id={child.id} defaultSize={`${node.sizes[index]}%`} minSize="10%">
            <div
              ref={bothLeaves ? (index === 0 ? refA : refB) : undefined}
              className="h-full relative"
            >
              <WorkspaceSplitter node={child} />
            </div>
          </Panel>
          {index < node.children.length - 1 && (
            // No children here: v4 hit-tests separator presses in the capture
            // phase on the group, so a button inside would never get clicks.
            <Separator
              aria-label={node.direction === "horizontal" ? "Resize panes horizontally" : "Resize panes vertically"}
              className={`
                ${node.direction === "horizontal" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"}
                bg-edge-subtle dark:bg-clay/70
                hover:bg-edge active:bg-fg-faint
                transition-colors duration-200
                z-10
              `}
            />
          )}
        </React.Fragment>
      ))}
    </Group>
  );
}
