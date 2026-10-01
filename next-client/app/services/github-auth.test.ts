// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  GITHUB_SESSION_MAX_AGE_SECONDS,
  getGitHubAuthConfig,
  isValidOAuthState,
  openGitHubSession,
  sealGitHubSession,
} from "./github-auth";

const secret = "0123456789abcdef0123456789abcdef";

describe("GitHub authentication helpers", () => {
  it("requires complete, secure OAuth configuration", () => {
    expect(() => getGitHubAuthConfig({})).toThrow("not configured");
    expect(() => getGitHubAuthConfig({
      GITHUB_OAUTH_CLIENT_ID: "client",
      GITHUB_OAUTH_CLIENT_SECRET: "secret",
      GITHUB_SESSION_SECRET: secret,
      GITHUB_OAUTH_APP_URL: "http://example.test",
    })).toThrow("HTTPS");
  });

  it("encrypts and expires server-only session tokens", () => {
    const now = 1_000_000;
    const sealed = sealGitHubSession("github-token", now, secret);
    expect(sealed).not.toContain("github-token");
    expect(openGitHubSession(sealed, now, secret)).toEqual({
      accessToken: "github-token",
      expiresAt: now + GITHUB_SESSION_MAX_AGE_SECONDS * 1000,
    });
    expect(openGitHubSession(sealed, now + GITHUB_SESSION_MAX_AGE_SECONDS * 1000, secret)).toBeNull();
  });

  it("rejects tampered sessions and mismatched OAuth state", () => {
    const sealed = sealGitHubSession("github-token", 1_000_000, secret);
    expect(openGitHubSession(`${sealed}x`, 1_000_000, secret)).toBeNull();
    expect(isValidOAuthState("expected", "received")).toBe(false);
    expect(isValidOAuthState("expected", "expected")).toBe(true);
  });
});
