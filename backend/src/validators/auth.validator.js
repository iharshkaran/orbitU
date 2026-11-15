import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters.").max(80),
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8, "Password must contain at least 8 characters.").max(100),
  verificationToken: z.string().min(20).max(2000),
  university: z.string().trim().max(160).optional().default(""),
  course: z.string().trim().max(100).optional().default(""),
  year: z.string().trim().max(50).optional().default(""),
  bio: z.string().trim().max(1200).optional().default(""),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).optional().default([]),
}).strict();

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1, "Enter your password.").max(100),
  remember: z.boolean().optional().default(true),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().length(64).regex(/^[a-f0-9]+$/i, "This reset link is invalid or expired."),
  password: z.string().min(8, "Password must contain at least 8 characters.").max(100),
}).strict();

export const sendSignupCodeSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(2).max(80),
}).strict();

export const verifySignupCodeSchema = z.object({
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase().trim()),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
}).strict();

