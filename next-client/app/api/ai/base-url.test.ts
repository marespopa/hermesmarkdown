// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lookupMock = vi.fn();
vi.mock('node:dns/promises', () => ({ lookup: (...args: unknown[]) => lookupMock(...args) }));

import { BaseUrlError, validateBaseUrl } from './base-url';

describe('validateBaseUrl', () => {
  beforeEach(() => {
    lookupMock.mockResolvedValue([{ address: '104.18.0.1', family: 4 }]);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('accepts a public https host and drops the trailing slash', async () => {
    await expect(validateBaseUrl('https://ollama.com/')).resolves.toBe('https://ollama.com');
  });

  it('rejects http for a public host', async () => {
    await expect(validateBaseUrl('http://ollama.com')).rejects.toBeInstanceOf(BaseUrlError);
  });

  it.each([
    'https://localhost:11434',
    'https://127.0.0.1',
    'https://[::1]',
    'https://10.0.0.5',
    'https://172.16.4.2',
    'https://192.168.1.10',
    'https://169.254.169.254',
    'https://printer.local',
    'https://db.internal',
  ])('rejects %s', async (url) => {
    await expect(validateBaseUrl(url)).rejects.toThrow(/Base URL not allowed/);
  });

  it('rejects a host that resolves to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '10.1.2.3', family: 4 }]);
    await expect(validateBaseUrl('https://sneaky.example.com')).rejects.toThrow(/private or loopback/);
  });

  it('rejects a host that cannot be resolved', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(validateBaseUrl('https://nowhere.example.com')).rejects.toThrow(/could not be resolved/);
  });

  it('rejects something that is not a URL', async () => {
    await expect(validateBaseUrl('not a url')).rejects.toThrow(/not a valid URL/);
  });

  it('allows private setups when ALLOW_PRIVATE_AI_BASE_URL is true', async () => {
    vi.stubEnv('ALLOW_PRIVATE_AI_BASE_URL', 'true');
    await expect(validateBaseUrl('http://192.168.1.10:11434/')).resolves.toBe('http://192.168.1.10:11434');
  });
});
