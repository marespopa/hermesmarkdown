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

export function clearTokens(): void {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.tokenExpiry);
}
