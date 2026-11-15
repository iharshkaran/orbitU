import { z } from "zod";

export const commentSchema = z.object({
  text: z.string().trim().min(1).max(500),
  parentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict();
export const editCommentSchema = z.object({ text: z.string().trim().min(1).max(500) }).strict();
export const commentParamsSchema = z.object({
  postId: z.string().regex(/^[a-f\d]{24}$/i),
  commentId: z.string().regex(/^[a-f\d]{24}$/i),
});
