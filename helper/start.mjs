import { randomBytes } from "node:crypto";
import { createProjectCheckServer } from "./project-check-helper.mjs";

const rootFlag = process.argv.indexOf("--root");
const root = rootFlag >= 0 ? process.argv[rootFlag + 1] : "";
if (!root || process.argv.length !== 4) {
  console.error("Usage: node helper/start.mjs --root /absolute/project/directory");
  process.exitCode = 2;
} else {
  const pairingCode = randomBytes(18).toString("base64url");
  try {
    const helper = await createProjectCheckServer({ root, pairingCode });
    console.log(`Project check helper listening on http://127.0.0.1:${helper.port}`);
    console.log(`Selected project: ${helper.projectRoot}`);
    console.log(`One-time pairing code: ${pairingCode}`);
    console.log("Keep this terminal open. Checks run only after in-app approval. Each check runs in a disposable copy of the selected project, so the selected tree is not modified; this is not an OS sandbox, and network blocking is best effort.");
    process.on("SIGINT", () => void helper.close().then(() => process.exit(0)));
    process.on("SIGTERM", () => void helper.close().then(() => process.exit(0)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
