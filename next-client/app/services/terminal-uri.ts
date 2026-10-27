// The "Open Terminal" palette command's address: ssh://user@host, opened
// through the operating system's ssh:// handler (Terminal, iTerm, Windows
// OpenSSH). A browser can't start a shell itself, so this is the whole
// feature: build a safe URI from the user's Settings, or refuse.

const HOSTNAME_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const DOTTED_NUMBERS = /^\d+(?:\.\d+)*$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const BRACKETED_IPV6 = /^\[[0-9A-Fa-f:.]+\]$/;

function isIpv4(host: string): boolean {
  const match = IPV4.exec(host);
  return !!match && match.slice(1).every((octet) => Number(octet) <= 255);
}

// A hostname (RFC 1123 labels), an IPv4 address, or an IPv6 address in
// brackets. Whitespace, "/", "@" and anything else that could change the
// URI's meaning fail every pattern.
export function isValidSshHost(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (host.startsWith("[")) return BRACKETED_IPV6.test(host) && host.includes(":");
  // All-numeric dotted text is an IPv4 address or nothing ("999.1.1.1", "1.2.3").
  if (DOTTED_NUMBERS.test(host)) return isIpv4(host);
  return host.split(".").every((label) => HOSTNAME_LABEL.test(label));
}

// ssh://user@host, or ssh://host when the user is empty; null when the host
// is missing or invalid. Both parts are trimmed; the user is percent-encoded.
export function buildSshUri(user: string, host: string): string | null {
  const trimmedHost = host.trim();
  if (!isValidSshHost(trimmedHost)) return null;
  const trimmedUser = user.trim();
  return trimmedUser
    ? `ssh://${encodeURIComponent(trimmedUser)}@${trimmedHost}`
    : `ssh://${trimmedHost}`;
}
