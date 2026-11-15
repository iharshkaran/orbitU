import { Router } from "express";
import { currentUser, forgotPassword, login, logout, register, resetPasswordWithToken, sendSignupCode, verifySignupCode } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { limitLoginAttempts, limitPasswordResetAttempts, limitPasswordResetRequests, limitRegistrationAttempts, limitSignupCodeAttempts, limitSignupCodeSends } from "../middleware/authRateLimit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, sendSignupCodeSchema, verifySignupCodeSchema } from "../validators/auth.validator.js";

const router = Router();
router.post("/register", limitRegistrationAttempts, validate(registerSchema), asyncHandler(register));
router.post("/login", limitLoginAttempts, validate(loginSchema), asyncHandler(login));
router.post("/forgot-password", limitPasswordResetRequests, validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post("/reset-password", limitPasswordResetAttempts, validate(resetPasswordSchema), asyncHandler(resetPasswordWithToken));
router.post("/signup/send-code", limitSignupCodeSends, validate(sendSignupCodeSchema), asyncHandler(sendSignupCode));
router.post("/signup/verify-code", limitSignupCodeAttempts, validate(verifySignupCodeSchema), asyncHandler(verifySignupCode));
router.post("/logout", logout);
router.get("/me", requireAuth, currentUser);
export default router;
