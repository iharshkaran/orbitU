import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import SignupEmailVerification from "../models/SignupEmailVerification.js";
import { sendPasswordResetEmail, sendSignupVerificationEmail } from "./email.service.js";

const PASSWORD_ROUNDS = 12;
const SESSION_DURATION = "7d";
const SIGNUP_CODE_DURATION_MS = 10 * 60 * 1000;
const SIGNUP_CODE_RESEND_DELAY_MS = 60 * 1000;
const SIGNUP_CODE_SEND_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_CODE_MAX_SENDS = 5;
const SIGNUP_CODE_MAX_ATTEMPTS = 5;

function assertJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    const error = new Error("JWT_SECRET must be at least 24 characters long. Set it in backend/.env.");
    error.status = 500;
    throw error;
  }
}

export function createSessionToken(userId, tokenVersion = 0) {
  assertJwtSecret();
  return jwt.sign({ sub: String(userId), ver: tokenVersion }, process.env.JWT_SECRET, { expiresIn: SESSION_DURATION });
}

export function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    headline: user.headline,
    university: user.university,
    course: user.course,
    year: user.year,
    location: user.location,
    bio: user.bio,
    skills: user.skills,
    photo: user.photo,
    banner: user.banner,
    projects: user.projects || [],
    education: user.education || [],
    featured: user.featured || [],
    portfolioUrl: user.portfolioUrl,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input) {
  assertJwtSecret();
  const { verificationToken, ...accountInput } = input;
  let verifiedEmail;
  try {
    const payload = jwt.verify(verificationToken, process.env.JWT_SECRET);
    if (payload.purpose === "signup-email-verified" && typeof payload.sub === "string") verifiedEmail = payload.sub;
  } catch {
    // A missing, malformed or expired verification ticket is handled uniformly below.
  }
  if (verifiedEmail !== accountInput.email) {
    const error = new Error("Verify your email address before creating an account.");
    error.status = 403;
    throw error;
  }

  const existing = await User.exists({ email: input.email });
  if (existing) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_ROUNDS);
  const headline = [input.course, input.year, "Student"].filter(Boolean).join(" · ") || "Student";
  const user = await User.create({ ...accountInput, headline, passwordHash });
  return { user, token: createSessionToken(user._id, user.tokenVersion || 0) };
}

export async function loginUser({ email, password }) {
  assertJwtSecret();
  const user = await User.findOne({ email }).select("+passwordHash +tokenVersion");
  const passwordMatches = user && await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    const error = new Error("Email or password is incorrect.");
    error.status = 401;
    throw error;
  }
  return { user, token: createSessionToken(user._id, user.tokenVersion || 0) };
}

const RESET_TOKEN_DURATION_MS = 30 * 60 * 1000;

function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function hashSignupCode(email, code) {
  assertJwtSecret();
  return createHmac("sha256", process.env.JWT_SECRET).update(`${email}:${code}`).digest("hex");
}

function invalidSignupCodeError() {
  const error = new Error("That code is incorrect or expired. Request a new code and try again.");
  error.status = 400;
  return error;
}

export async function sendSignupVerificationCode(email, name) {
  assertJwtSecret();
  if (await User.exists({ email })) {
    const error = new Error("An account with this email already exists. Please sign in instead.");
    error.status = 409;
    throw error;
  }

  const now = new Date();
  const existing = await SignupEmailVerification.findOne({ email });
  if (existing?.lastSentAt && now.getTime() - existing.lastSentAt.getTime() < SIGNUP_CODE_RESEND_DELAY_MS) {
    const error = new Error("Please wait a minute before requesting another code.");
    error.status = 429;
    throw error;
  }
  const withinSendWindow = existing?.sendWindowStartedAt
    && now.getTime() - existing.sendWindowStartedAt.getTime() < SIGNUP_CODE_SEND_WINDOW_MS;
  if (withinSendWindow && existing.sendCount >= SIGNUP_CODE_MAX_SENDS) {
    const error = new Error("Too many codes were sent to this email. Please try again in 15 minutes.");
    error.status = 429;
    throw error;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashSignupCode(email, code);
  await SignupEmailVerification.findOneAndUpdate({ email }, {
    $set: {
      codeHash,
      expiresAt: new Date(now.getTime() + SIGNUP_CODE_DURATION_MS),
      attempts: 0,
      sendCount: withinSendWindow ? existing.sendCount + 1 : 1,
      sendWindowStartedAt: withinSendWindow ? existing.sendWindowStartedAt : now,
      lastSentAt: now,
    },
  }, { upsert: true, new: true, setDefaultsOnInsert: true });

  try {
    await sendSignupVerificationEmail({ email, name, code });
  } catch (deliveryError) {
    await SignupEmailVerification.deleteOne({ email, codeHash });
    console.error("Brevo could not deliver an email verification code:", deliveryError.message);
    const error = new Error("We couldn't send a verification code right now. Check the Brevo sender settings and try again.");
    error.status = 503;
    throw error;
  }
}

export async function verifySignupEmailCode(email, code) {
  assertJwtSecret();
  const challenge = await SignupEmailVerification.findOne({ email }).select("+codeHash");
  if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= SIGNUP_CODE_MAX_ATTEMPTS) {
    throw invalidSignupCodeError();
  }

  const expectedHash = Buffer.from(challenge.codeHash, "hex");
  const submittedHash = Buffer.from(hashSignupCode(email, code), "hex");
  if (expectedHash.length !== submittedHash.length || !timingSafeEqual(expectedHash, submittedHash)) {
    await SignupEmailVerification.updateOne({ _id: challenge._id, attempts: { $lt: SIGNUP_CODE_MAX_ATTEMPTS } }, { $inc: { attempts: 1 } });
    throw invalidSignupCodeError();
  }

  const consumedChallenge = await SignupEmailVerification.findOneAndDelete({
    _id: challenge._id,
    codeHash: challenge.codeHash,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: SIGNUP_CODE_MAX_ATTEMPTS },
  });
  if (!consumedChallenge) throw invalidSignupCodeError();

  const verificationToken = jwt.sign({ sub: email, purpose: "signup-email-verified" }, process.env.JWT_SECRET, { expiresIn: "10m" });
  return { verificationToken };
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");
  if (!user) return { accountExists: false, emailSent: false };

  const token = randomBytes(32).toString("hex");
  user.passwordResetTokenHash = hashResetToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS);
  await user.save();

  try {
    await sendPasswordResetEmail({ email: user.email, name: user.name, token });
    return { accountExists: true, emailSent: true };
  } catch (error) {
    await User.updateOne({ _id: user._id, passwordResetTokenHash: hashResetToken(token) }, {
      $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
    });
    console.error("Brevo could not deliver a password reset email:", error.message);
    return { accountExists: true, emailSent: false };
  }
}

export async function resetPassword(token, password) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
  const updatedUser = await User.findOneAndUpdate({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }, {
    $set: { passwordHash },
    $inc: { tokenVersion: 1 },
    $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
  }, { new: true }).select("+tokenVersion");

  if (!updatedUser) {
    const error = new Error("This password reset link is invalid or expired. Request a new one.");
    error.status = 400;
    throw error;
  }
}
