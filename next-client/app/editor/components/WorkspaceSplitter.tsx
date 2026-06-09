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
            <Separator className={`
              ${node.direction === "horizontal" ? "w-1" : "h-1"} 
              bg-neutral-100 dark:bg-neutral-800 
              hover:bg-sage/50 active:bg-sage
              transition-colors duration-200
              z-10
            `} />
          )}
        </React.Fragment>
      ))}
    </Group>
  );
}
