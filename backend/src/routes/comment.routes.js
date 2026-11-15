import { Router } from "express";
import { addComment, editComment, getComments, removeComment } from "../controllers/comment.controller.js";
import { asyncHandler } from "../middleware/async.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate, validateParams } from "../middleware/validate.middleware.js";
import { postIdParamsSchema } from "../validators/common.validator.js";
import { commentParamsSchema, commentSchema, editCommentSchema } from "../validators/comment.validator.js";

const router = Router({ mergeParams: true });
router.use(requireAuth, validateParams(postIdParamsSchema));
router.get("/", asyncHandler(getComments));
router.post("/", validate(commentSchema), asyncHandler(addComment));
router.patch("/:commentId", validateParams(commentParamsSchema), validate(editCommentSchema), asyncHandler(editComment));
router.delete("/:commentId", validateParams(commentParamsSchema), asyncHandler(removeComment));
export default router;
