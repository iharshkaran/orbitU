import { z } from "zod";

export const aiSuggestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("caption"),
    draft: z.string().trim().max(3000).default(""),
    category: z.enum(["General", "Project", "Hackathon", "Learning", "Achievement"]).default("General"),
    mediaType: z.enum(["image", "video", "pdf", "none"]).default("none"),
    imageUrl: z.string().url().max(2200).optional().default(""),
  }).refine(({ imageUrl, mediaType }) => {
    if (!imageUrl) return true;
    try {
      const { protocol, hostname } = new URL(imageUrl);
      return mediaType === "image" && protocol === "https:" && (hostname === "ik.imagekit.io" || hostname.endsWith(".imagekit.io"));
    } catch {
      return false;
    }
  }, { message: "Caption images must be uploaded to ImageKit." }),
  z.object({
    type: z.literal("commentReply"),
    postText: z.string().trim().max(3000).default(""),
    commentText: z.string().trim().min(1).max(500),
    parentCommentText: z.string().trim().max(500).default(""),
  }),
]);
