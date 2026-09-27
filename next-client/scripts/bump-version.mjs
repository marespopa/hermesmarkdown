import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const bumpTypes = ["major", "minor", "patch"];
const projectDirectory = process.env.VERSION_BUMP_DIRECTORY
  ? resolve(process.env.VERSION_BUMP_DIRECTORY)
  : resolve(fileURLToPath(new URL("..", import.meta.url)));
const packagePath = resolve(projectDirectory, "package.json");
const packageLockPath = resolve(projectDirectory, "package-lock.json");
const requestedBumps = bumpTypes.filter(
  (type) =>
    process.argv.slice(2).includes(type) ||
    process.argv.slice(2).includes(`--${type}`) ||
    process.env[`npm_config_${type}`] === "true",
);

if (requestedBumps.length !== 1) {
  console.error("Usage: yarn run version --major|--minor|--patch");
  process.exitCode = 1;
} else {
  // The project uses Yarn, whose lockfile doesn't record the workspace
  // version, so package.json is the only required manifest. A legacy
  // package-lock.json is kept in sync when present.
  const hasPackageLock = await access(packageLockPath).then(() => true, () => false);
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const packageLock = hasPackageLock ? JSON.parse(await readFile(packageLockPath, "utf8")) : null;
  const currentVersion = packageJson.version;

  if (typeof currentVersion !== "string") {
    throw new Error("package.json must contain a version before bumping.");
  }
  if (packageLock && (packageLock.version !== currentVersion || packageLock.packages?.[""]?.version !== currentVersion)) {
    throw new Error("package.json and package-lock.json must contain the same version before bumping.");
  }

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);
  if (!match) {
    throw new Error(`Cannot bump non-semantic version "${currentVersion}".`);
  }

  let [major, minor, patch] = match.slice(1).map(Number);
  switch (requestedBumps[0]) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
      patch += 1;
      break;
  }

  const nextVersion = `${major}.${minor}.${patch}`;
  packageJson.version = nextVersion;
  const writes = [writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)];
  if (packageLock) {
    packageLock.version = nextVersion;
    packageLock.packages[""].version = nextVersion;
    writes.push(writeFile(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`));
  }
  await Promise.all(writes);

  console.log(`Version bumped: ${currentVersion} -> ${nextVersion}`);
}
