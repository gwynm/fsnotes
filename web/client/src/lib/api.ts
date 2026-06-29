import type { Note, Folder, SaveStatus, UploadResult, ApiError } from '../types';

class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let body: ApiError;
    try {
      body = await res.json();
    } catch {
      throw new ApiClientError(res.statusText, 'UNKNOWN', res.status);
    }
    throw new ApiClientError(body.error, body.code, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function listNotes(params?: {
  folder?: string;
  search?: string;
  sort?: string;
  dir?: string;
  trash?: boolean;
}): Promise<Note[]> {
  const qs = new URLSearchParams();
  if (params?.folder) qs.set('folder', params.folder);
  if (params?.search) qs.set('search', params.search);
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.dir) qs.set('dir', params.dir);
  if (params?.trash) qs.set('trash', 'true');
  const query = qs.toString();
  return request<Note[]>(`/api/notes${query ? `?${query}` : ''}`);
}

export function getNote(path: string): Promise<Note> {
  return request<Note>(`/api/notes/${encodeURIComponent(path)}`);
}

export function createNote(data: {
  folder: string;
  filename: string;
  content: string;
}): Promise<Note> {
  return request<Note>('/api/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateNote(path: string, content: string): Promise<Note> {
  return request<Note>(`/api/notes/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export function patchNote(
  path: string,
  data: { filename?: string; folder?: string },
): Promise<Note> {
  return request<Note>(`/api/notes/${encodeURIComponent(path)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteNote(path: string, permanent?: boolean): Promise<void> {
  const qs = permanent ? '?permanent=true' : '';
  return request<void>(`/api/notes/${encodeURIComponent(path)}${qs}`, {
    method: 'DELETE',
  });
}

export function listFolders(): Promise<Folder[]> {
  return request<Folder[]>('/api/folders');
}

export function createFolder(name: string): Promise<Folder> {
  return request<Folder>('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function renameFolder(oldName: string, newName: string): Promise<Folder> {
  return request<Folder>(`/api/folders/${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: newName }),
  });
}

export function deleteFolder(name: string): Promise<void> {
  return request<void>(`/api/folders/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    let body: ApiError;
    try {
      body = await res.json();
    } catch {
      throw new ApiClientError(res.statusText, 'UNKNOWN', res.status);
    }
    throw new ApiClientError(body.error, body.code, res.status);
  }
  return res.json();
}

export function getSaveStatus(): Promise<SaveStatus> {
  return request<SaveStatus>('/api/git/status');
}
