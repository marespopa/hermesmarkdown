// Google Drive OAuth2 — implicit flow (no backend required)
const SCOPES = 'https://www.googleapis.com/auth/drive';

const KEYS = {
  accessToken: 'hermes_drive_access_token',
  tokenExpiry: 'hermes_drive_token_expiry',
  oauthState: 'hermes_drive_oauth_state',
};

export function startOAuthFlow(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const state = Math.random().toString(36).substring(2);

  sessionStorage.setItem(KEYS.oauthState, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: SCOPES,
    state,
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function parseOAuthCallback(): { accessToken: string; expiresIn: number } | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.substring(1);
  if (!hash || !hash.includes('access_token')) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');

  if (!accessToken) return null;

  const savedState = sessionStorage.getItem(KEYS.oauthState);
  if (!state || !savedState || state !== savedState) {
    console.warn('Drive OAuth: state mismatch or missing, ignoring callback');
    return null;
  }

  sessionStorage.removeItem(KEYS.oauthState);
  return { accessToken, expiresIn: parseInt(expiresIn || '3600', 10) };
}

export function storeToken(accessToken: string, expiresIn: number): void {
  const expiry = Date.now() + expiresIn * 1000;
  localStorage.setItem(KEYS.accessToken, accessToken);
  localStorage.setItem(KEYS.tokenExpiry, expiry.toString());
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(KEYS.accessToken);
  const expiry = localStorage.getItem(KEYS.tokenExpiry);
  if (!token || !expiry) return null;
  // Return null if within 5 minutes of expiry
  if (Date.now() > parseInt(expiry, 10) - 5 * 60 * 1000) return null;
  return token;
}

export function isTokenValid(): boolean {
  return getStoredAccessToken() !== null;
}

// Raw expiry timestamp (ms), even if already past the 5-minute safety margin
// used by getStoredAccessToken. Used to schedule proactive background refreshes.
export function getTokenExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const expiry = localStorage.getItem(KEYS.tokenExpiry);
  return expiry ? parseInt(expiry, 10) : null;
}

export function clearTokens(): void {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.tokenExpiry);
}

// Silent re-auth via Google Identity Services — gets a fresh access token
// without a full redirect, as long as the browser still has an active
// Google session and consent was previously granted. Falls back to null
// (caller should show the reconnect banner) if silent auth isn't possible,
// e.g. third-party cookies blocked or the Google session itself expired.
let gisLoadPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

let tokenClient: any = null;

async function getTokenClient() {
  await loadGis();
  if (!tokenClient) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      scope: SCOPES,
      callback: () => {}, // overridden per-request below
    });
  }
  return tokenClient;
}

let inFlightRefresh: Promise<string | null> | null = null;

export async function refreshTokenSilently(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const client = await getTokenClient();
      return await new Promise<string | null>((resolve) => {
        client.callback = (resp: any) => {
          if (resp.error) {
            console.warn('Drive: silent token refresh failed', resp.error);
            resolve(null);
            return;
          }
          storeToken(resp.access_token, resp.expires_in);
          resolve(resp.access_token);
        };
        client.requestAccessToken({ prompt: '' });
      });
    } catch (err) {
      console.warn('Drive: silent token refresh error', err);
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

// Returns a valid access token, transparently attempting a silent refresh
// if the stored one is missing or within 5 minutes of expiry.
export async function ensureAccessToken(): Promise<string | null> {
  const stored = getStoredAccessToken();
  if (stored) return stored;
  return refreshTokenSilently();
}
