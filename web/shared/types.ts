export interface Note {
  path: string;
  folder: string;
  title: string;
  preview: string;
  createdAt: string;
  modifiedAt: string;
  content?: string;
}

export interface Folder {
  name: string;
  noteCount: number;
}

export interface SaveStatus {
  state: "saved" | "saving" | "error";
  error?: string;
}

export interface UploadResult {
  markdown: string;
}

export interface ApiError {
  error: string;
  code: string;
}
