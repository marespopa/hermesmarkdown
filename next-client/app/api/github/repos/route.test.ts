// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GITHUB_SESSION_COOKIE, sealGitHubSession } from "@/app/services/github-auth";

const fetchMock = vi.fn();
const secret = "0123456789abcdef0123456789abcdef";
const sha = "a".repeat(40);
const blobSha = "b".repeat(40);

function request(url: string, init?: Pick<RequestInit, "method" | "body" | "headers">) {
  return new NextRequest(url, {
    method: init?.method,
    body: init?.body,
    headers: {
      cookie: `${GITHUB_SESSION_COOKIE}=${sealGitHubSession("secret-token", Date.now(), secret)}`,
      ...init?.headers,
    },
  });
}

describe("GitHub repository routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_SESSION_SECRET = secret;
    global.fetch = fetchMock as typeof fetch;
  });

  it("lists paginated repositories without exposing the session token", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{
      id: 1, name: "notes", full_name: "octocat/notes", owner: { login: "octocat" },
      default_branch: "main", private: true,
    }]), { status: 200 }));

    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/github/repos?page=2&perPage=30"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      repositories: [{
        id: 1, name: "notes", fullName: "octocat/notes", owner: "octocat",
        defaultBranch: "main", private: true,
      }],
      page: 2,
      hasNextPage: false,
    });
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer secret-token");
  });

  it("rejects invalid repository creation before calling GitHub", async () => {
    const { POST } = await import("./route");
    const response = await POST(request("http://localhost/api/github/repos", {
      method: "POST",
      body: JSON.stringify({ name: "not valid" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid repository name." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a private repository regardless of client input", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      id: 2, name: "vault", full_name: "octocat/vault", owner: { login: "octocat" },
      default_branch: "main", private: true,
    }), { status: 201 }));

    const { POST } = await import("./route");
    const response = await POST(request("http://localhost/api/github/repos", {
      method: "POST",
      body: JSON.stringify({ name: "vault" }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(201);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "vault", private: true });
    expect(await response.json()).toMatchObject({ repository: { name: "vault", private: true } });
  });

  it("fetches only allowed recursive tree blobs", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 1, name: "notes", owner: { login: "octocat" }, default_branch: "main",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ object: { sha } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        truncated: false,
        tree: [
          { path: "notes/today.md", type: "blob", sha: blobSha },
          { path: "image.png", type: "blob", sha: "c".repeat(40) },
        ],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        encoding: "base64", content: Buffer.from("# Today").toString("base64"), size: 7,
      }), { status: 200 }));

    const { GET } = await import("./[owner]/[repository]/tree/route");
    const response = await GET(
      request("http://localhost/api/github/repos/octocat/notes/tree"),
      { params: Promise.resolve({ owner: "octocat", repository: "notes" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      repository: {
        repositoryId: 1, owner: "octocat", repository: "notes", branch: "main",
        displayName: "notes", baseHeadSha: sha,
      },
      files: [{ path: "notes/today.md", content: "# Today", blobSha }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("secret-token"))).toBe(true);
  });

  it("reads a specific branch snapshot for conflict-safe pulls", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 1, name: "notes", owner: { login: "octocat" }, default_branch: "main",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        truncated: false,
        tree: [{ path: "note.md", type: "blob", sha: blobSha }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        encoding: "base64", content: Buffer.from("baseline").toString("base64"), size: 8,
      }), { status: 200 }));

    const { GET } = await import("./[owner]/[repository]/tree/route");
    const response = await GET(
      request(`http://localhost/api/github/repos/octocat/notes/tree?branch=sync&ref=${sha}`),
      { params: Promise.resolve({ owner: "octocat", repository: "notes" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      repository: { branch: "sync", baseHeadSha: sha },
      files: [{ path: "note.md", content: "baseline", blobSha }],
    });
    expect(fetchMock.mock.calls[1][0]).toContain(`/git/commits/${sha}`);
  });
});
