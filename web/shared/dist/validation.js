import { z } from "zod";
export const createNoteSchema = z.object({
    folder: z.string().min(1),
    filename: z.string().min(1).regex(/\.md$/, "Filename must end with .md"),
    content: z.string().default(""),
});
export const updateNoteContentSchema = z.object({
    content: z.string(),
});
export const patchNoteSchema = z
    .object({
    filename: z.string().min(1).regex(/\.md$/).optional(),
    folder: z.string().min(1).optional(),
})
    .refine((d) => d.filename || d.folder, "Must provide filename or folder");
export const createFolderSchema = z.object({
    name: z
        .string()
        .min(1)
        .regex(/^[^/\\.\s][\w\s-]*$/, "Invalid folder name"),
});
export const renameFolderSchema = z.object({
    name: z
        .string()
        .min(1)
        .regex(/^[^/\\.\s][\w\s-]*$/, "Invalid folder name"),
});
//# sourceMappingURL=validation.js.map