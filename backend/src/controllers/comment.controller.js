import { createComment, deleteComment, listComments, updateComment } from "../services/comment.service.js";

export async function getComments(req, res) {
  const comments = await listComments(req.params.postId);
  return res.json({ success: true, data: comments });
}

export async function addComment(req, res) {
  const comment = await createComment({ postId: req.params.postId, user: req.user, ...req.validated });
  return res.status(201).json({ success: true, data: comment });
}

export async function editComment(req, res) {
  const comment = await updateComment({ postId: req.params.postId, commentId: req.params.commentId, userId: req.user._id, text: req.validated.text });
  return res.json({ success: true, data: comment });
}

export async function removeComment(req, res) {
  await deleteComment({ postId: req.params.postId, commentId: req.params.commentId, userId: req.user._id });
  return res.json({ success: true, data: { id: req.params.commentId } });
}
