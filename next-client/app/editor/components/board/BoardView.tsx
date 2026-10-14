"use client";

// The ONLY file that value-imports @excalidraw/* (enforced by lint). Loaded
// lazily through BoardViewLoader. The asset-path module must come first so
// fonts load from our own origin.
import "./excalidraw-asset-path";
import "@excalidraw/excalidraw/index.css";
import "./BoardView.css";
import { useCallback, useRef } from "react";
import { Excalidraw, MainMenu, hashElementsVersion } from "@excalidraw/excalidraw";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";
import { pickBoardAppState } from "@/app/utils/board/board-serialize";
import type { BoardScene } from "@/app/utils/board/board-format";
import BoardError from "./BoardError";
import { BOARD_UI_OPTIONS, blockFileDrop, blockFilePaste, renderBoardMenu } from "./board-ui-options";
import type { BoardViewProps } from "./board-types";
import { useBoardSync } from "./use-board-sync";
import { useBoardViewport } from "./use-board-viewport";

interface SceneApi {
  updateScene: (data: { elements?: unknown[]; appState?: Record<string, unknown> }) => void;
}

export default function BoardView({ path, content, onEditAsMarkdown }: BoardViewProps) {
  const theme = useResolvedTheme();
  const apiRef = useRef<SceneApi | null>(null);
  const viewport = useBoardViewport(path);

  const onExternalScene = useCallback((scene: BoardScene) => {
    apiRef.current?.updateScene({ elements: scene.elements, appState: pickBoardAppState(scene.appState) });
  }, []);

  const sync = useBoardSync({
    path,
    content,
    hashElements: hashElementsVersion as (elements: readonly any[]) => number,
    onExternalScene,
  });

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files?: any) => {
      viewport.report(appState);
      sync.handleChange(elements, appState, files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewport.report, sync.handleChange],
  );

  // The scene shown at mount; later text changes go through updateScene.
  const initialRef = useRef<any>(null);
  // After an error state the canvas remounts with the repaired scene.
  if (!sync.parsed.ok) initialRef.current = null;
  else if (!initialRef.current) {
    const { scene } = sync.parsed;
    const saved = viewport.initial;
    initialRef.current = {
      elements: scene.elements,
      appState: {
        ...scene.appState,
        ...(saved ? { scrollX: saved.scrollX, scrollY: saved.scrollY, zoom: { value: saved.zoom } } : {}),
      },
      files: scene.files,
      scrollToContent: !saved,
    };
  }

  if (!sync.parsed.ok) {
    return <BoardError kind={sync.parsed.error} onEditAsMarkdown={onEditAsMarkdown} />;
  }

  const ExcalidrawAny = Excalidraw as any;
  return (
    <div
      className="hermes-board h-full w-full pt-[var(--pane-header-inset,0px)]"
      onDropCapture={blockFileDrop}
      onDragOverCapture={blockFileDrop}
    >
      <div className="relative h-full w-full overflow-hidden">
        <ExcalidrawAny
          initialData={initialRef.current}
          theme={theme}
          excalidrawAPI={(api: SceneApi) => {
            apiRef.current = api;
          }}
          onChange={handleChange}
          onPaste={blockFilePaste}
          isCollaborating={false}
          UIOptions={BOARD_UI_OPTIONS}
        >
          {renderBoardMenu(MainMenu)}
        </ExcalidrawAny>
      </div>
    </div>
  );
}
