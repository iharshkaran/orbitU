import { Router } from "express";
import { generateSuggestions } from "../controllers/ai.controller.js";
import { asyncHandler } from "../middleware/async.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { aiSuggestionSchema } from "../validators/ai.validator.js";

const router = Router();
router.post("/suggestions", requireAuth, validate(aiSuggestionSchema), asyncHandler(generateSuggestions));
export default router;
