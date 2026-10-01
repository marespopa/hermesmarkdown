// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GITHUB_SESSION_COOKIE, sealGitHubSession } from "@/app/services/github-auth";

const fetchMock = vi.fn();
const secret = "0123456789abcdef0123456789abcdef";
const headSha = "a".repeat(40);
const treeSha = "b".repeat(40);
const blobSha = "c".repeat(40);
const commitSha = "d".repeat(40);
const operationId = "d7b40e31-7f9b-4076-9403-a979c0f7f795";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/github/repos/octocat/notes/sync?branch=main", {
    method: "POST",
    headers: {
      cookie: `${GITHUB_SESSION_COOKIE}=${sealGitHubSession("secret-token", Date.now(), secret)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  baseHeadSha: headSha,
  message: "Update today's notes",
  operationId,
  changes: [{ path: "today.md", content: "# Today" }],
};

describe("GitHub vault sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_SESSION_SECRET = secret;
    global.fetch = fetchMock as typeof fetch;
  });

  it("creates blobs, an atomic commit, and advances the expected branch", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ object: { sha: headSha } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tree: { sha: treeSha } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: blobSha }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: treeSha }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: commitSha }), { status: 201 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const { POST } = await import("./route");
    const response = await POST(request(validBody), {
      params: Promise.resolve({ owner: "octocat", repository: "notes" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      headSha: commitSha,
      changes: [{ path: "today.md", blobSha }],
    });
    expect(JSON.parse(fetchMock.mock.calls[4][1].body).message)
      .toContain(`Hermes-Sync-Operation: ${operationId}`);
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({ sha: commitSha, force: false });
  });

  it("refuses to overwrite a branch that advanced remotely", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ object: { sha: commitSha } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        tree: { sha: treeSha },
        message: "A different remote change",
      }), { status: 200 }));

    const { POST } = await import("./route");
    const response = await POST(request(validBody), {
      params: Promise.resolve({ owner: "octocat", repository: "notes" }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This branch changed remotely. Reopen the vault before committing.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("creates the initial branch when GitHub reports an empty repository", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Git Repository is empty." }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: commitSha } }), { status: 201 }));

    const { POST } = await import("./route");
    const response = await POST(request({ ...validBody, baseHeadSha: null }), {
      params: Promise.resolve({ owner: "octocat", repository: "notes" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      headSha: commitSha,
      changes: [{ path: "today.md", blobSha: null }],
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      message: "Initialize GitHub vault",
      branch: "main",
    });
  });
});
