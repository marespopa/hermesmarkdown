"use client";

import React from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { WorkspaceContainer, PanelLeaf as PanelLeafType } from "@/app/types/workspace";
import PaneLeaf from "./PaneLeaf";

interface WorkspaceSplitterProps {
  node: WorkspaceContainer | PanelLeafType;
}

export default function WorkspaceSplitter({ node }: WorkspaceSplitterProps) {
  if ("type" in node) {
    // It's a PanelLeaf
    return <PaneLeaf leaf={node} />;
  }

  // It's a WorkspaceContainer
  return (
    <Group orientation={node.direction}>
      {node.children.map((child, index) => (
        <React.Fragment key={child.id}>
          <Panel defaultSize={node.sizes[index]}>
            <div className="h-full relative">
              <WorkspaceSplitter node={child} />
            </div>
          </Panel>
          {index < node.children.length - 1 && (
            <Separator
              aria-label={node.direction === "horizontal" ? "Resize panes horizontally" : "Resize panes vertically"}
              className={`
                ${node.direction === "horizontal" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"}
                bg-edge-subtle dark:bg-clay/70
                hover:bg-sage/60 active:bg-sage
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
