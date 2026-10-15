"use client";

import dynamic from "next/dynamic";
import type { BoardViewProps } from "./board-types";

// The only thing PaneLeaf imports: Excalidraw loads in its own chunk on the
// first board, so the editor route's first load stays unchanged.
const BoardView = dynamic(() => import("./BoardView"), {
  ssr: false,
  loading: () => <div className="h-full bg-surface-raised motion-safe:animate-pulse" aria-hidden="true" />,
});

export default function BoardViewLoader(props: BoardViewProps) {
  return <BoardView {...props} />;
}
