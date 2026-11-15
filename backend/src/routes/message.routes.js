import { Router } from "express";
import { getInbox, getPresence, getThread, reactToMessage, removeMessage, sendMessage, sendTyping, streamMessageEvents, updateMessage } from "../controllers/message.controller.js";
import { asyncHandler } from "../middleware/async.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate, validateParams } from "../middleware/validate.middleware.js";
import { messageActionParamsSchema, messageEditSchema, messageReactionSchema, messageSchema, messageUserParamsSchema } from "../validators/message.validator.js";

const router = Router();
router.use(requireAuth);
router.get("/events", streamMessageEvents);
router.get("/presence", asyncHandler(getPresence));
router.post("/typing/:userId", validateParams(messageUserParamsSchema), asyncHandler(sendTyping));
router.get("/", asyncHandler(getInbox));
router.patch("/:userId/:messageId", validateParams(messageActionParamsSchema), validate(messageEditSchema), asyncHandler(updateMessage));
router.delete("/:userId/:messageId", validateParams(messageActionParamsSchema), asyncHandler(removeMessage));
router.put("/:userId/:messageId/reaction", validateParams(messageActionParamsSchema), validate(messageReactionSchema), asyncHandler(reactToMessage));
router.get("/:userId", validateParams(messageUserParamsSchema), asyncHandler(getThread));
router.post("/:userId", validateParams(messageUserParamsSchema), validate(messageSchema), asyncHandler(sendMessage));
export default router;
