import { z } from "zod";

const projectIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id.") }).strict();
const requestParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), requestId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid request id.") }).strict();
const listQuerySchema = z.object({ q: z.string().trim().max(100).optional().default("") }).strict();

const projectSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(2000),
  skills: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  roles: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  teamSize: z.number().int().min(2).max(12).default(4),
}).strict();
const projectUpdateSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  roles: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  teamSize: z.number().int().min(2).max(12).optional(),
  status: z.enum(["open", "closed", "completed"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose a project update.");

const joinRequestSchema = z.object({ message: z.string().trim().max(500).optional().default("") }).strict();
const requestDecisionSchema = z.object({ action: z.enum(["accept", "reject"]) }).strict();
const milestoneIdParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), milestoneId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid milestone id.") }).strict();
const taskIdParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), taskId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid task id.") }).strict();
const taskCommentParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), taskId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid task id."), commentId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid comment id.") }).strict();
const workspaceIdParamsSchema = projectIdSchema;
const milestoneSchema = z.object({
  title: z.string().trim().min(2).max(100),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional().default(""),
}).strict();
const milestoneUpdateSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional(),
  status: z.enum(["upcoming", "completed"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose a milestone update.");
const taskSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional().default(""),
  assigneeId: z.union([z.literal(""), z.string().regex(/^[a-f\d]{24}$/i)]).optional().default(""),
  milestoneId: z.union([z.literal(""), z.string().regex(/^[a-f\d]{24}$/i)]).optional().default(""),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional().default(""),
}).strict();
const taskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(600).optional(),
  status: z.enum(["backlog", "in_progress", "done"]).optional(),
  assigneeId: z.union([z.literal(""), z.string().regex(/^[a-f\d]{24}$/i)]).optional(),
  milestoneId: z.union([z.literal(""), z.string().regex(/^[a-f\d]{24}$/i)]).optional(),
  dueDate: z.union([z.literal(""), z.iso.date()]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose a task update.");
const taskCommentSchema = z.object({ text: z.string().trim().min(1).max(1000) }).strict();

const inviteParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), inviteeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid student id.") }).strict();
const invitationDecisionParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), invitationId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid invitation id.") }).strict();
const invitationDecisionSchema = z.object({ action: z.enum(["accept", "decline"]) }).strict();
const resourceParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), resourceId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid resource id.") }).strict();
const memberParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id."), memberId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid member id.") }).strict();
const memberRoleUpdateSchema = z.object({ role: z.enum(["admin", "member", "viewer"]) }).strict();
const resourceSchema = z.object({
  title: z.string().trim().min(2).max(100),
  url: z.url().max(2200).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Use a valid http or https URL."),
  type: z.enum(["link", "file"]),
  fileName: z.string().trim().max(180).optional().default(""),
  mimeType: z.string().trim().max(120).optional().default(""),
  size: z.number().int().min(0).max(50 * 1024 * 1024).optional().default(0),
}).strict().refine((value) => value.type !== "file" || Boolean(value.fileName), "Choose a file to share.");

export { invitationDecisionParamsSchema, invitationDecisionSchema, inviteParamsSchema, joinRequestSchema, listQuerySchema, memberParamsSchema, memberRoleUpdateSchema, milestoneIdParamsSchema, milestoneSchema, milestoneUpdateSchema, projectIdSchema, projectSchema, projectUpdateSchema, requestDecisionSchema, requestParamsSchema, resourceParamsSchema, resourceSchema, taskCommentParamsSchema, taskCommentSchema, taskIdParamsSchema, taskSchema, taskUpdateSchema, workspaceIdParamsSchema };
