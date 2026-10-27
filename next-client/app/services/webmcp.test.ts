import { afterEach, describe, expect, it, vi } from "vitest";
import { registerNoteTools } from "./webmcp";
import { getModelContext, type ModelContextLike, type WebMcpTool } from "./webmcp-context";

function fakeContext() {
  const tools = new Map<string, WebMcpTool>();
  const context: ModelContextLike & { tools: typeof tools } = {
    tools,
    registerTool: vi.fn(async (tool: WebMcpTool, options?: { signal?: AbortSignal }) => {
      tools.set(tool.name, tool);
      options?.signal?.addEventListener("abort", () => tools.delete(tool.name));
    }),
  };
  return context;
}

describe("registerNoteTools", () => {
  it("offers the read-only note tools with JSON Schema inputs", async () => {
    const context = fakeContext();
    await registerNoteTools(context, vi.fn(), new AbortController().signal);

    expect([...context.tools.keys()]).toEqual(["search_notes", "read_note", "list_open_tasks"]);
    const search = context.tools.get("search_notes")!;
    expect(search.annotations).toEqual({ readOnlyHint: true, untrustedContentHint: true });
    expect(search.inputSchema).toMatchObject({ type: "object", required: ["query"], properties: { query: { type: "string" } } });
    expect(search.inputSchema).not.toHaveProperty("$schema");
  });

  it("runs a call through the note tools and answers with their text", async () => {
    const context = fakeContext();
    const run = vi.fn().mockResolvedValue("1 note matches \"roadmap\"");
    await registerNoteTools(context, run, new AbortController().signal);

    await expect(context.tools.get("search_notes")!.execute({ query: "roadmap" })).resolves.toBe("1 note matches \"roadmap\"");
    expect(run).toHaveBeenCalledWith("search_notes", { query: "roadmap" });
  });

  it("withdraws the tools when the signal aborts, by name too for early previews", async () => {
    const context = fakeContext();
    context.unregisterTool = vi.fn();
    const controller = new AbortController();
    await registerNoteTools(context, vi.fn(), controller.signal);

    controller.abort();

    expect(context.tools.size).toBe(0);
    expect(context.unregisterTool).toHaveBeenCalledWith("read_note");
  });

  it("keeps offering the other tools when one is refused", async () => {
    const context = fakeContext();
    const register = context.registerTool;
    context.registerTool = vi.fn(async (tool: WebMcpTool, options?: { signal?: AbortSignal }) => {
      if (tool.name === "read_note") throw new Error("taken");
      await register(tool, options);
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await registerNoteTools(context, vi.fn(), new AbortController().signal);

    expect([...context.tools.keys()]).toEqual(["search_notes", "list_open_tasks"]);
  });
});

describe("getModelContext", () => {
  afterEach(() => {
    delete (document as unknown as { modelContext?: unknown }).modelContext;
  });

  it("is null where the browser offers no WebMCP", () => {
    expect(getModelContext()).toBeNull();
  });

  it("finds document.modelContext", () => {
    const context = fakeContext();
    (document as unknown as { modelContext?: unknown }).modelContext = context;
    expect(getModelContext()).toBe(context);
  });
});
