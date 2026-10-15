// Side-effect module: must be imported before Excalidraw so its fonts load
// from our own origin (copied by scripts/copy-excalidraw-assets.mjs).
if (typeof window !== "undefined") {
  (window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
}

export {};
