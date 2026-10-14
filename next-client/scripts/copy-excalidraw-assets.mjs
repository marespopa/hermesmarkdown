// Copies Excalidraw's fonts from node_modules to public/excalidraw-assets/ so
// boards load them from the same origin (no third-party requests). The output
// is gitignored; `dev` and `build` run this first. Idempotent.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const target = path.join(root, "public/excalidraw-assets/fonts");

if (!existsSync(source)) {
  console.error(`copy-excalidraw-assets: ${source} not found. Run "corepack yarn install" first.`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log("copy-excalidraw-assets: fonts copied to public/excalidraw-assets/fonts");
