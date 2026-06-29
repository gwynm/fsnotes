import { z } from "zod";
export declare const createNoteSchema: z.ZodObject<{
    folder: z.ZodString;
    filename: z.ZodString;
    content: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    folder: string;
    filename: string;
    content: string;
}, {
    folder: string;
    filename: string;
    content?: string | undefined;
}>;
export declare const updateNoteContentSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const patchNoteSchema: z.ZodEffects<z.ZodObject<{
    filename: z.ZodOptional<z.ZodString>;
    folder: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    folder?: string | undefined;
    filename?: string | undefined;
}, {
    folder?: string | undefined;
    filename?: string | undefined;
}>, {
    folder?: string | undefined;
    filename?: string | undefined;
}, {
    folder?: string | undefined;
    filename?: string | undefined;
}>;
export declare const createFolderSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const renameFolderSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type CreateNote = z.infer<typeof createNoteSchema>;
export type UpdateNoteContent = z.infer<typeof updateNoteContentSchema>;
export type PatchNote = z.infer<typeof patchNoteSchema>;
export type CreateFolder = z.infer<typeof createFolderSchema>;
export type RenameFolder = z.infer<typeof renameFolderSchema>;
//# sourceMappingURL=validation.d.ts.map