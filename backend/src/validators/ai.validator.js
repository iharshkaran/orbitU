import { z } from "zod";

export const aiSuggestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("caption"),
    draft: z.string().trim().max(3000).default(""),
    category: z.enum(["General", "Project", "Hackathon", "Learning", "Achievement"]).default("General"),
    mediaType: z.enum(["image", "video", "pdf", "none"]).default("none"),
    captionLength: z.enum(["auto", "short", "medium", "long"]).default("auto"),
    customPrompt: z.string().trim().max(500).default(""),
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
    type: z.literal("profileHeadline"),
    currentText: z.string().trim().max(160).default(""),
    customPrompt: z.string().trim().max(500).default(""),
    name: z.string().trim().max(80).default(""),
    course: z.string().trim().max(100).default(""),
    year: z.string().trim().max(50).default(""),
    university: z.string().trim().max(160).default(""),
    skills: z.array(z.string().trim().max(40)).max(30).default([]),
  }),
  z.object({
    type: z.literal("profileBio"),
    currentText: z.string().trim().max(1200).default(""),
    customPrompt: z.string().trim().max(500).default(""),
    bioLength: z.enum(["auto", "short", "detailed"]).default("auto"),
    name: z.string().trim().max(80).default(""),
    course: z.string().trim().max(100).default(""),
    year: z.string().trim().max(50).default(""),
    university: z.string().trim().max(160).default(""),
    location: z.string().trim().max(100).default(""),
    skills: z.array(z.string().trim().max(40)).max(30).default([]),
  }),
  z.object({
    type: z.literal("commentReply"),
    postText: z.string().trim().max(3000).default(""),
    commentText: z.string().trim().min(1).max(500),
    parentCommentText: z.string().trim().max(500).default(""),
  }),
]);
