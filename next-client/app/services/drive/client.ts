import { getStoredAccessToken } from './auth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

export const FOLDER_MIME = 'application/vnd.google-apps.folder';

const BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DriveError';
  }
}

async function req(url: string, opts: RequestInit = {}, retried = false, signal?: AbortSignal): Promise<Response> {
  const token = getStoredAccessToken();
  if (!token) throw new DriveError(401, 'Drive token expired or missing');

  try {
    const res = await fetch(url, {
      ...opts,
      signal,
      headers: { Authorization: `Bearer ${token}`, ...opts.headers },
    });

    if (res.status === 429 && !retried) {
      const after = parseInt(res.headers.get('Retry-After') || '5', 10);
      await new Promise(r => setTimeout(r, after * 1000));
      return req(url, opts, true, signal);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new DriveError(res.status, body?.error?.message || `Request failed with status ${res.status}`);
    }

    return res;
  } catch (err: any) {
    if (err.name === 'AbortError' || (err instanceof Error && err.message.includes('aborted'))) throw err;
    if (err instanceof DriveError) throw err;
    throw new DriveError(0, `Network error: ${err.message || 'Failed to fetch'}. Please check your internet connection or Google Drive status.`);
  }
}

export async function listFiles(folderId: string, pageToken?: string, signal?: AbortSignal): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'nextPageToken,files(id,name,mimeType,modifiedTime)',
    pageSize: '1000',
    orderBy: 'name',
  });
  if (pageToken) params.set('pageToken', pageToken);
  const res = await req(`${BASE}/files?${params}`, {}, false, signal);
  return res.json();
}


export async function getFileContent(fileId: string): Promise<string> {
  const res = await req(`${BASE}/files/${fileId}?alt=media`);
  return res.text();
}

export async function getFile(fileId: string): Promise<DriveFile> {
  const res = await req(`${BASE}/files/${fileId}?fields=id,name,mimeType,modifiedTime`);
  return res.json();
}

export async function createFile(name: string, folderId: string, content: string): Promise<DriveFile> {
  const metadata = { name, mimeType: 'text/markdown', parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('media', new Blob([content], { type: 'text/plain' }));
  const res = await req(`${UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function updateFile(fileId: string, content: string): Promise<DriveFile> {
  const res = await req(`${UPLOAD}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'text/plain' },
    body: content,
  });
  return res.json();
}

export async function renameFile(fileId: string, newName: string): Promise<DriveFile> {
  const res = await req(`${BASE}/files/${fileId}?fields=id,name,mimeType,modifiedTime`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
  return res.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  await req(`${BASE}/files/${fileId}`, { method: 'DELETE' });
}

export async function moveFile(fileId: string, newParentId: string, oldParentId: string): Promise<DriveFile> {
  const params = new URLSearchParams({
    addParents: newParentId,
    removeParents: oldParentId,
    fields: 'id,name,mimeType,modifiedTime',
  });
  const res = await req(`${BASE}/files/${fileId}?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function createFolder(name: string, parentId: string): Promise<DriveFile> {
  const res = await req(`${BASE}/files?fields=id,name,mimeType,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  return res.json();
}
