import { describe, expect, it } from "vitest";
import { buildSshUri, isValidSshHost } from "./terminal-uri";

describe("buildSshUri", () => {
  it("joins user and host", () => {
    expect(buildSshUri("dev", "localhost")).toBe("ssh://dev@localhost");
  });

  it("leaves the user out when it's empty", () => {
    expect(buildSshUri("", "localhost")).toBe("ssh://localhost");
    expect(buildSshUri("   ", "example.com")).toBe("ssh://example.com");
  });

  it("trims both parts", () => {
    expect(buildSshUri("  dev ", "  build.local  ")).toBe("ssh://dev@build.local");
  });

  it("percent-encodes the user", () => {
    expect(buildSshUri("a b@c", "localhost")).toBe("ssh://a%20b%40c@localhost");
    expect(buildSshUri("x/../y", "localhost")).toBe("ssh://x%2F..%2Fy@localhost");
  });

  it("accepts IPv4 and bracketed IPv6 hosts", () => {
    expect(buildSshUri("dev", "192.168.1.20")).toBe("ssh://dev@192.168.1.20");
    expect(buildSshUri("", "[::1]")).toBe("ssh://[::1]");
    expect(buildSshUri("dev", "[fe80::1:2]")).toBe("ssh://dev@[fe80::1:2]");
  });

  it("returns null for a missing or invalid host", () => {
    expect(buildSshUri("dev", "")).toBeNull();
    expect(buildSshUri("dev", "   ")).toBeNull();
    expect(buildSshUri("dev", "my host")).toBeNull();
    expect(buildSshUri("dev", "host/path")).toBeNull();
    expect(buildSshUri("dev", "other@host")).toBeNull();
  });
});

describe("isValidSshHost", () => {
  it("accepts hostnames", () => {
    for (const host of ["localhost", "example.com", "build-01.lan", "a.b.c.d.example"]) {
      expect(isValidSshHost(host)).toBe(true);
    }
  });

  it("rejects malformed hostnames", () => {
    for (const host of ["-bad.com", "bad-.com", "a..b", ".lead", "trail.", "under_score.com", "host:22", "x".repeat(64)]) {
      expect(isValidSshHost(host)).toBe(false);
    }
  });

  it("rejects out-of-range or partial IPv4", () => {
    expect(isValidSshHost("256.1.1.1")).toBe(false);
    expect(isValidSshHost("1.2.3")).toBe(false);
    expect(isValidSshHost("10.0.0.255")).toBe(true);
  });

  it("requires brackets and a colon for IPv6", () => {
    expect(isValidSshHost("::1")).toBe(false);
    expect(isValidSshHost("[::1")).toBe(false);
    expect(isValidSshHost("[1234]")).toBe(false);
    expect(isValidSshHost("[::g]")).toBe(false);
  });

  it("rejects whitespace, slashes and @", () => {
    for (const host of ["a b", "a\tb", "a/b", "a@b", "ssh://host"]) {
      expect(isValidSshHost(host)).toBe(false);
    }
  });
});
