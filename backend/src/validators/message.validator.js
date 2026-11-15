import { z } from "zod";

const messageText = z.string().trim().min(1).max(2000);
export const messageSchema = z.object({ text: messageText, replyToId: z.string().regex(/^[a-f\d]{24}$/i).optional() }).strict();
export const messageEditSchema = z.object({ text: messageText }).strict();
export const messageReactionSchema = z.object({ emoji: z.enum(["❤️", "😂", "👍", "😮", "😢", "🔥", "🙏", "👏", "🎉"]) }).strict();
export const messageUserParamsSchema = z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user id.") });
export const messageActionParamsSchema = messageUserParamsSchema.extend({ messageId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid message id.") });
