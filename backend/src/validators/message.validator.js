import { z } from "zod";

const messageText = z.string().trim().min(1).max(2000);
const messageMediaSchema = z.object({
  url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Media URL must use HTTPS."),
  type: z.enum(["image", "video", "pdf"]),
  name: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().max(120).optional().default(""),
}).strict();
export const messageSchema = z.object({
  text: z.string().trim().max(2000).optional().default(""),
  media: messageMediaSchema.optional(),
  replyToId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict().refine((value) => value.text.length > 0 || Boolean(value.media), { message: "Write a message or attach a file." });
export const messageEditSchema = z.object({ text: messageText }).strict();
export const messageReactionSchema = z.object({ emoji: z.enum(["❤️", "😂", "👍", "😮", "😢", "🔥", "🙏", "👏", "🎉"]) }).strict();
export const messageUserParamsSchema = z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id.") });
export const messageActionParamsSchema = messageUserParamsSchema.extend({ messageId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid message id.") });
