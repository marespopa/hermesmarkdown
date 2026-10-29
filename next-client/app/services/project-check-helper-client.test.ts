import { beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectProjectCheckHelper, pairProjectCheckHelper, projectCheckPairing, redactProjectCheckOutput, runProjectCheck } from "./project-check-helper-client";

const ndjson = (events: unknown[]) => new Response(new ReadableStream({ start(controller) { events.forEach((event) => controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`))); controller.close(); } }), { status: 200 });

describe("project-check helper client", () => {
  beforeEach(() => disconnectProjectCheckHelper());
  it("pairs with the loopback helper and sends only a check ID", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ protocolVersion: 1, token: "token", projectRoot: "/work/app" })).mockResolvedValueOnce(ndjson([{ type: "output", text: "ok\n" }, { type: "result", status: "completed", exitCode: 0, durationMs: 7 }]));
    await pairProjectCheckHelper("pair", fetcher);
    expect(projectCheckPairing()).toMatchObject({ paired: true, projectRoot: "/work/app" });
    const result = await runProjectCheck("typecheck", { fetchImpl: fetcher });
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string)).toEqual({ checkId: "typecheck" });
    expect(result).toMatchObject({ status: "completed", exitCode: 0, output: "ok\n" });
  });
  it("rejects malformed pairing and malformed helper events", async () => {
    await expect(pairProjectCheckHelper("bad", vi.fn().mockResolvedValue(Response.json({ protocolVersion: 0 })))).rejects.toThrow("invalid pairing");
    await pairProjectCheckHelper("ok", vi.fn().mockResolvedValue(Response.json({ protocolVersion: 1, token: "token", projectRoot: "/work" })));
    const malformed = new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("{broken}\n")); controller.close(); } }), { status: 200 });
    expect((await runProjectCheck("typecheck", { fetchImpl: vi.fn().mockResolvedValue(malformed) })).status).toBe("disconnected");
  });
  it("handles timeout, abort, output caps, redaction and helper disconnect", async () => {
    expect(redactProjectCheckOutput("api_key=abc123 sk-123456789012345")).toContain("[REDACTED]");
    await pairProjectCheckHelper("ok", vi.fn().mockResolvedValue(Response.json({ protocolVersion: 1, token: "token", projectRoot: "/work" })));
    const output = "x".repeat(40000);
    const capped = await runProjectCheck("typecheck", { fetchImpl: vi.fn().mockResolvedValue(ndjson([{ type: "output", text: output }, { type: "result", status: "completed", exitCode: 0, durationMs: 5 }])) });
    expect(capped.output.length).toBeLessThanOrEqual(2000);
    vi.useFakeTimers();
    try {
      const timedFetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })));
      const pending = runProjectCheck("typecheck", { fetchImpl: timedFetch });
      await vi.advanceTimersByTimeAsync(122_000);
      expect((await pending).status).toBe("timed_out");
    } finally { vi.useRealTimers(); }
    const abort = new AbortController(); abort.abort();
    expect((await runProjectCheck("typecheck", { signal: abort.signal, fetchImpl: vi.fn() })).status).toBe("cancelled");
    const down = await runProjectCheck("typecheck", { fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) });
    expect(down.status).toBe("disconnected");
  });
});
