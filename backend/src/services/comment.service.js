import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { NOTIFICATION_TYPES } from "../constants/notification.types.js";
import { createNotification } from "./notification.service.js";
import { httpError } from "../utils/httpError.js";

function formatComment(comment) {
  return {
    id: String(comment._id),
    authorId: String(comment.author?._id || comment.author),
    parentId: comment.parentComment ? String(comment.parentComment._id || comment.parentComment) : null,
    name: comment.author?.name || "Student",
    photo: comment.author?.photo || "",
    text: comment.text,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export async function listComments(postId) {
  const postExists = await Post.exists({ _id: postId });
  if (!postExists) throw httpError(404, "Post not found.");
  const comments = await Comment.find({ post: postId }).populate("author", "name photo").sort({ createdAt: 1 });
  return comments.map(formatComment);
}

export async function createComment({ postId, user, text, parentId }) {
  const post = await Post.findById(postId);
  if (!post) throw httpError(404, "Post not found.");
  let parentComment = null;
  if (parentId) {
    parentComment = await Comment.findOne({ _id: parentId, post: post._id, parentComment: null });
    if (!parentComment) throw httpError(404, "Comment not found.");
  }
  const comment = await Comment.create({ post: post._id, author: user._id, text, parentComment: parentComment?._id || null });
  const notificationRecipient = parentComment?.author || post.author;
  if (String(notificationRecipient) !== String(user._id)) {
    await createNotification({
      recipient: notificationRecipient,
      actor: user._id,
      type: NOTIFICATION_TYPES.COMMENT,
      message: parentComment ? `${user.name} replied to your comment.` : `${user.name} commented on your post.`,
      post: post._id,
    });
  }
  await comment.populate("author", "name photo");
  return formatComment(comment);
}

export async function updateComment({ postId, commentId, userId, text }) {
  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, post: postId, author: userId },
    { $set: { text } },
    { new: true, runValidators: true },
  ).populate("author", "name photo");
  if (!comment) throw httpError(404, "Comment not found or you cannot edit it.");
  return formatComment(comment);
}

export async function deleteComment({ postId, commentId, userId }) {
  const comment = await Comment.findOneAndDelete({ _id: commentId, post: postId, author: userId });
  if (!comment) throw httpError(404, "Comment not found or you cannot delete it.");
  if (!comment.parentComment) await Comment.deleteMany({ parentComment: comment._id, post: postId });
}
