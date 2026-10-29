import { projectCheckById, PROJECT_CHECK_MAX_LINE_CHARS, PROJECT_CHECK_MAX_OUTPUT_CHARS, type ProjectCheckId } from "./project-checks";

export const PROJECT_CHECK_HELPER_URL = "http://127.0.0.1:43125";
export type ProjectCheckStatus = "completed" | "failed" | "timed_out" | "cancelled" | "disconnected" | "unavailable" | "nonzero_exit";
export interface ProjectCheckResult {
  status: ProjectCheckStatus;
  exitCode: number | null;
  durationMs: number;
  output: string;
  error?: string;
}

let token: string | null = null;
let projectRoot: string | null = null;
let active = false;
let activeController: AbortController | null = null;
let pairingGeneration = 0;
const REDACTIONS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bAIza[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /((?:api[_-]?key|token|password|secret)\s*[:=]\s*)[^\s,;]+/gi,
];

export function redactProjectCheckOutput(value: string): string {
  return REDACTIONS.reduce((text, pattern) => text.replace(pattern, (_, prefix) => prefix ? `${prefix}[REDACTED]` : "[REDACTED]"), value);
}

export function projectCheckPairing() {
  return { paired: !!token, projectRoot, generation: pairingGeneration };
}

export function disconnectProjectCheckHelper() {
  pairingGeneration += 1;
  activeController?.abort();
  token = null;
  projectRoot = null;
}

export async function pairProjectCheckHelper(code: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`${PROJECT_CHECK_HELPER_URL}/pair`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.trim() }),
  });
  if (!response.ok) throw new Error(response.status === 403 ? "Pairing code was not accepted." : "Could not reach the local helper.");
  const value = await response.json() as { protocolVersion?: unknown; token?: unknown; projectRoot?: unknown };
  if (value.protocolVersion !== 1 || typeof value.token !== "string" || typeof value.projectRoot !== "string") throw new Error("The local helper sent an invalid pairing response.");
  pairingGeneration += 1;
  activeController?.abort();
  token = value.token;
  projectRoot = value.projectRoot;
  return { projectRoot };
}

export async function runProjectCheck(id: ProjectCheckId, { signal, onOutput, fetchImpl = fetch }: {
  signal?: AbortSignal;
  onOutput?: (line: string) => void;
  fetchImpl?: typeof fetch;
} = {}): Promise<ProjectCheckResult> {
  const definition = projectCheckById(id);
  if (!definition) return { status: "unavailable", exitCode: null, durationMs: 0, output: "", error: "Unknown project check." };
  if (!token) return { status: "unavailable", exitCode: null, durationMs: 0, output: "", error: "Pair the local helper before running a project check." };
  if (active) return { status: "failed", exitCode: null, durationMs: 0, output: "", error: "A project check is already awaiting approval or running." };
  active = true;
  const controller = new AbortController();
  activeController = controller;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, definition.timeoutMs + 2_000);
  let output = "";
  let durationMs = 0;
  try {
    const response = await fetchImpl(`${PROJECT_CHECK_HELPER_URL}/run`, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ checkId: id }), signal: controller.signal,
    });
    if (response.status === 401) { disconnectProjectCheckHelper(); return { status: "disconnected", exitCode: null, durationMs: 0, output: "", error: "The helper pairing expired. Pair it again in Settings." }; }
    if (!response.ok || !response.body) return { status: response.status === 409 ? "failed" : "disconnected", exitCode: null, durationMs: 0, output: "", error: "The local helper is unavailable or refused the check." };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const final: { value: Omit<ProjectCheckResult, "output"> | null } = { value: null };
    const consume = (line: string) => {
      if (!line) return;
      let event: Record<string, unknown>;
      try { event = JSON.parse(line) as Record<string, unknown>; } catch { throw new Error("The local helper sent malformed output."); }
      if (event.type === "output" && typeof event.text === "string") {
        const safe = redactProjectCheckOutput(event.text).slice(0, PROJECT_CHECK_MAX_LINE_CHARS);
        const remaining = PROJECT_CHECK_MAX_OUTPUT_CHARS - output.length;
        if (remaining > 0) { const shown = safe.slice(0, remaining); output += shown; onOutput?.(shown); }
      } else if (event.type === "status" && event.status === "timed_out") {
        final.value = { status: "timed_out", exitCode: null, durationMs };
      } else if (event.type === "result") {
        const status = event.status;
        if (!["completed", "failed", "timed_out", "cancelled"].includes(String(status))) throw new Error("The local helper sent an unknown status.");
        final.value = { status: status as ProjectCheckStatus, exitCode: typeof event.exitCode === "number" ? event.exitCode : null, durationMs: Number(event.durationMs) || 0, ...(typeof event.error === "string" ? { error: redactProjectCheckOutput(event.error).slice(0, PROJECT_CHECK_MAX_LINE_CHARS) } : {}) };
      } else if (event.type !== "limit") throw new Error("The local helper sent an unknown event.");
    };
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(consume);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    const finalResult = final.value;
    if (!finalResult) return { status: "disconnected", exitCode: null, durationMs, output, error: "The helper disconnected before reporting a result." };
    durationMs = finalResult.durationMs;
    if (finalResult.status === "failed" && finalResult.exitCode !== null && finalResult.exitCode !== 0) finalResult.status = "nonzero_exit";
    return { ...finalResult, output };
  } catch (error) {
    if (timedOut) return { status: "timed_out", exitCode: null, durationMs, output, error: "The project check exceeded its time limit." };
    if (controller.signal.aborted) return { status: "cancelled", exitCode: null, durationMs, output, error: "Project check cancelled." };
    controller.abort();
    return { status: "disconnected", exitCode: null, durationMs, output, error: error instanceof Error ? error.message : "The local helper disconnected." };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
    active = false;
    if (activeController === controller) activeController = null;
  }
}
