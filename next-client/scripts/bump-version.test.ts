import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptPath = join(process.cwd(), "scripts", "bump-version.mjs");
const temporaryDirectories: string[] = [];

async function createVersionFixtures(version = "5.2.0") {
  const directory = await mkdtemp(join(tmpdir(), "hermesmarkdown-version-"));
  temporaryDirectories.push(directory);
  await writeFile(join(directory, "package.json"), `${JSON.stringify({ name: "hermesmarkdown", version }, null, 2)}\n`);
  await writeFile(
    join(directory, "package-lock.json"),
    `${JSON.stringify({ name: "hermesmarkdown", version, packages: { "": { name: "hermesmarkdown", version } } }, null, 2)}\n`,
  );
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("bump-version", () => {
  it("bumps matching package manifests for a minor release", async () => {
    const directory = await createVersionFixtures();

    await execFileAsync(process.execPath, [scriptPath, "--minor"], {
      env: { ...process.env, VERSION_BUMP_DIRECTORY: directory },
    });

    const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    const packageLock = JSON.parse(await readFile(join(directory, "package-lock.json"), "utf8"));
    expect(packageJson.version).toBe("5.3.0");
    expect(packageLock.version).toBe("5.3.0");
    expect(packageLock.packages[""].version).toBe("5.3.0");
  });

  it("bumps package.json alone when there is no package-lock.json", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hermesmarkdown-version-"));
    temporaryDirectories.push(directory);
    await writeFile(join(directory, "package.json"), `${JSON.stringify({ name: "hermesmarkdown", version: "6.0.5" }, null, 2)}\n`);

    await execFileAsync(process.execPath, [scriptPath, "--patch"], {
      env: { ...process.env, VERSION_BUMP_DIRECTORY: directory },
    });

    const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    expect(packageJson.version).toBe("6.0.6");
  });

  it("rejects mismatched manifest versions without modifying either file", async () => {
    const directory = await createVersionFixtures();
    await writeFile(
      join(directory, "package-lock.json"),
      `${JSON.stringify({ name: "hermesmarkdown", version: "5.1.0", packages: { "": { name: "hermesmarkdown", version: "5.1.0" } } }, null, 2)}\n`,
    );

    await expect(
      execFileAsync(process.execPath, [scriptPath, "--patch"], {
        env: { ...process.env, VERSION_BUMP_DIRECTORY: directory },
      }),
    ).rejects.toThrow("package.json and package-lock.json must contain the same version");

    const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    expect(packageJson.version).toBe("5.2.0");
  });
});
