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
export interface GitStatus {
    clean: boolean;
    ahead: number;
    behind: number;
    files: number;
}
export interface UploadResult {
    markdown: string;
}
export interface ApiError {
    error: string;
    code: string;
}
//# sourceMappingURL=types.d.ts.map