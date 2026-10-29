import { createServer } from "node:http";
import { spawn as nodeSpawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cp, mkdtemp, realpath, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const catalogFile = fileURLToPath(new URL("../next-client/app/services/project-check-catalog.json", import.meta.url));
const catalog = JSON.parse(await (await import("node:fs/promises")).readFile(catalogFile, "utf8"));
const allowedOrigins = new Set(["https://hermesmarkdown.com", "https://www.hermesmarkdown.com"]);
const MAX_BODY_BYTES = 4096;
const MAX_OUTPUT = 32_000;
const MAX_LINE = 2_000;
const REDACTIONS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bAIza[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /((?:api[_-]?key|token|password|secret)\s*[:=]\s*)[^\s,;]+/gi,
];

export function redactOutput(value) {
  return REDACTIONS.reduce((text, pattern) => text.replace(pattern, (_, prefix) => prefix ? `${prefix}[REDACTED]` : "[REDACTED]"), String(value));
}

function originAllowed(origin) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && ["http:", "https:"].includes(url.protocol);
  } catch { return false; }
}

function sameSecret(given, expected) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

function sendJson(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error("Request is too large.");
  }
  return JSON.parse(body || "{}");
}

function commandFor(check, platform = process.platform, execPath = process.execPath) {
  if (check.argv[0] !== "corepack") return { file: check.argv[0], args: check.argv.slice(1) };
  if (platform !== "win32") return { file: "corepack", args: check.argv.slice(1) };
  const nodeDir = dirname(execPath);
  const corepack = join(nodeDir, "node_modules", "corepack", "dist", "corepack.js");
  return { file: execPath, args: [corepack, ...check.argv.slice(1)] };
}

function safeEnvironment() {
  const env = {};
  for (const key of ["PATH", "HOME", "USERPROFILE", "TMP", "TEMP", "SystemRoot", "WINDIR"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.COREPACK_ENABLE_NETWORK = "0";
  env.YARN_ENABLE_NETWORK = "0";
  env.npm_config_offline = "true";
  env.CI = "1";
  return env;
}

function killGroup(child, platform = process.platform) {
  if (!child?.pid) return;
  if (platform === "win32") {
    const killer = nodeSpawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true, stdio: "ignore" });
    killer.on("error", () => child.kill("SIGKILL"));
    return;
  }
  try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
  setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } }, 1200).unref();
}

export async function createProjectCheckServer({ root, pairingCode = randomBytes(18).toString("base64url"), port = 43125, spawnProcess = nodeSpawn } = {}) {
  if (!root) throw new Error("Choose a project directory when starting the helper.");
  const projectRoot = await realpath(root);
  if (!(await stat(projectRoot)).isDirectory()) throw new Error("The selected project root is not a directory.");
  let pairedToken = randomBytes(32).toString("base64url");
  let active = false;
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (!originAllowed(origin) || req.socket.remoteAddress && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) {
      sendJson(res, 403, { error: "Untrusted local request." });
      return;
    }
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "authorization, content-type");
    res.setHeader("access-control-max-age", "600");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { protocolVersion: 1, checks: catalog.map(({ id }) => id) });
      return;
    }
    if (req.method !== "POST" || !["/pair", "/run"].includes(req.url)) { sendJson(res, 404, { error: "Not found." }); return; }
    let input;
    try { input = await readJson(req); } catch { sendJson(res, 400, { error: "Invalid request body." }); return; }
    if (!input || typeof input !== "object" || Array.isArray(input)) { sendJson(res, 400, { error: "A JSON object is required." }); return; }
    if (req.url === "/pair") {
      if (Object.keys(input).length !== 1 || !sameSecret(input.code, pairingCode)) { sendJson(res, 403, { error: "Pairing code was not accepted." }); return; }
      pairedToken = randomBytes(32).toString("base64url");
      sendJson(res, 200, { protocolVersion: 1, token: pairedToken, projectRoot });
      return;
    }
    const authorization = req.headers.authorization ?? "";
    if (!sameSecret(authorization.startsWith("Bearer " ) ? authorization.slice(7) : "", pairedToken)) { sendJson(res, 401, { error: "Pair the local helper again." }); return; }
    if (Object.keys(input).length !== 1 || typeof input.checkId !== "string") {
      sendJson(res, 400, { error: "Only a fixed check ID is accepted; commands and arguments are not allowed." });
      return;
    }
    const check = catalog.find(({ id }) => id === input.checkId);
    if (!check) { sendJson(res, 400, { error: "Unknown project check." }); return; }
    if (active) { sendJson(res, 409, { error: "A project check is already running." }); return; }
    active = true;
    res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    let outputSize = 0;
    let timedOut = false;
    let cancelled = false;
    let child;
    let workspaceRoot;
    const lineBuffers = { stdout: "", stderr: "" };
    const droppingLongLine = new Set();
    let outputLimited = false;
    const emit = (event) => { if (!res.destroyed) res.write(`${JSON.stringify(event)}\n`); };
    const emitLine = (stream, raw, newline) => {
      const redacted = redactOutput(raw);
      const bounded = redacted.slice(0, MAX_LINE);
      const remaining = MAX_OUTPUT - outputSize;
      if (remaining <= 0) { outputLimited = true; emit({ type: "limit" }); killGroup(child); return; }
      const text = `${bounded.slice(0, remaining)}${newline && raw.length <= MAX_LINE ? "\n" : ""}`;
      outputSize += text.length;
      emit({ type: "output", stream, text });
      if (raw.length > MAX_LINE || text.length < bounded.length || outputSize >= MAX_OUTPUT) {
        outputLimited = true;
        emit({ type: "limit" });
        killGroup(child);
      }
    };
    const capture = (stream, chunk) => {
      if (outputLimited) return;
      let rest = lineBuffers[stream] + chunk.toString("utf8");
      lineBuffers[stream] = "";
      while (rest) {
        if (droppingLongLine.has(stream)) {
          const newline = rest.indexOf("\n");
          if (newline < 0) return;
          rest = rest.slice(newline + 1);
          droppingLongLine.delete(stream);
          continue;
        }
        const newline = rest.indexOf("\n");
        const complete = newline >= 0;
        const line = complete ? rest.slice(0, newline) : rest;
        if (line.length > MAX_LINE) {
          emitLine(stream, line.slice(0, MAX_LINE), false);
          if (!complete) droppingLongLine.add(stream);
        } else if (complete) emitLine(stream, line, true);
        else lineBuffers[stream] = line;
        if (!complete) return;
        rest = rest.slice(newline + 1);
        if (outputLimited) return;
      }
    };
    try {
      const command = commandFor(check);
      workspaceRoot = await mkdtemp(join(tmpdir(), "hermesmarkdown-project-check-"));
      await cp(projectRoot, workspaceRoot, {
        recursive: true,
        force: true,
        dereference: true,
        filter: (source) => ![".git", ".next", "coverage"].includes(source.slice(projectRoot.length + 1).split(/[\\/]/)[0]),
      });
      child = spawnProcess(command.file, command.args, {
        cwd: workspaceRoot, env: safeEnvironment(), shell: false, windowsHide: true,
        detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout?.on("data", (chunk) => capture("stdout", chunk));
      child.stderr?.on("data", (chunk) => capture("stderr", chunk));
      child.stdout?.on("end", () => { if (!droppingLongLine.has("stdout") && lineBuffers.stdout) emitLine("stdout", lineBuffers.stdout, false); });
      child.stderr?.on("end", () => { if (!droppingLongLine.has("stderr") && lineBuffers.stderr) emitLine("stderr", lineBuffers.stderr, false); });
      const started = Date.now();
      const timeout = setTimeout(() => { timedOut = true; emit({ type: "status", status: "timed_out" }); killGroup(child); }, Math.min(check.timeoutMs, 120_000));
      res.on("close", () => { if (!res.writableEnded) { cancelled = true; killGroup(child); } });
      const result = await new Promise((resolve) => {
        child.once("error", (error) => resolve({ error: error.message, code: null }));
        child.once("close", (code) => resolve({ code, error: null }));
      });
      clearTimeout(timeout);
      const status = timedOut ? "timed_out" : cancelled ? "cancelled" : result.error ? "failed" : result.code === 0 ? "completed" : "failed";
      emit({ type: "result", status, exitCode: result.code, durationMs: Date.now() - started, error: result.error ? redactOutput(result.error) : undefined });
      if (!res.destroyed) res.end();
    } catch (error) {
      emit({ type: "result", status: "failed", exitCode: null, durationMs: 0, error: redactOutput(error instanceof Error ? error.message : String(error)) });
      if (!res.destroyed) res.end();
    } finally {
      active = false;
      if (workspaceRoot) await rm(workspaceRoot, { recursive: true, force: true }).catch(() => {});
    }
  });
  server.on("close", () => { pairedToken = ""; });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, port, pairingCode, projectRoot, close: () => new Promise((resolve) => server.close(resolve)) };
}
