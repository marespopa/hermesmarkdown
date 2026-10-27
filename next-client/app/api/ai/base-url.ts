import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// The Ollama base URL comes from the user's browser, so the server must not be
// turned into a way to reach its own network. A URL is accepted when it is
// https and every address its host resolves to is public. Local instances are
// called from the browser instead (app/services/ai.ts), never through here.
// ALLOW_PRIVATE_AI_BASE_URL=true lifts the check for self-hosted setups.
const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost'];

const isPrivateIPv4 = (ip: string): boolean => {
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
};

const isPrivateAddress = (ip: string): boolean => {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || /^fe[89ab]/.test(lower);
};

export class BaseUrlError extends Error {
  constructor(reason: string) {
    super(`Base URL not allowed: ${reason}`);
  }
}

// The normalized URL (no trailing slash), or a BaseUrlError.
export async function validateBaseUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BaseUrlError('it is not a valid URL.');
  }
  if (process.env.ALLOW_PRIVATE_AI_BASE_URL === 'true') {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new BaseUrlError('use http or https.');
    return url.toString().replace(/\/+$/, '');
  }
  if (url.protocol !== 'https:') throw new BaseUrlError('it must use https.');

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new BaseUrlError('it points at a local or internal host.');
  }
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => { throw new BaseUrlError('the host could not be resolved.'); })).map((a) => a.address);
  if (addresses.some(isPrivateAddress)) throw new BaseUrlError('it points at a private or loopback address.');
  return url.toString().replace(/\/+$/, '');
}
