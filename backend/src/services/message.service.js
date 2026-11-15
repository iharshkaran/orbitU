import mongoose from "mongoose";
import Follow from "../models/Follow.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { httpError } from "../utils/httpError.js";
import { getOnlineMessageUserIds, publishMessageEvent } from "./messageEvents.service.js";

const userFields = "name headline course year university photo";

async function ensureConnected(userId, otherUserId) {
  if (String(userId) === String(otherUserId)) throw httpError(400, "You cannot message yourself.");
  if (!mongoose.isValidObjectId(otherUserId)) throw httpError(400, "Invalid student id.");
  const [userExists, connection] = await Promise.all([
    User.exists({ _id: otherUserId }),
    Follow.exists({ status: "accepted", $or: [{ from: userId, to: otherUserId }, { from: otherUserId, to: userId }] }),
  ]);
  if (!userExists) throw httpError(404, "Student not found.");
  if (!connection) throw httpError(403, "You can message students after connecting.");
}

function formatMessage(message, viewerId) {
  const sender = message.sender || {};
  const reply = message.replyTo || null;
  return {
    id: String(message._id),
    senderId: String(sender._id || sender),
    from: String(sender._id || sender) === String(viewerId) ? "you" : "them",
    text: message.text,
    createdAt: message.createdAt,
    editedAt: message.editedAt || null,
    readAt: message.readAt,
    replyTo: reply ? {
      id: String(reply._id),
      text: reply.text,
      from: String(reply.sender?._id || reply.sender) === String(viewerId) ? "you" : "them",
      name: reply.sender?.name || "Student",
    } : null,
    reactions: (message.reactions || []).map((reaction) => ({ userId: String(reaction.user?._id || reaction.user), emoji: reaction.emoji })),
  };
}

function populateMessage(message) {
  return message.populate({
    path: "replyTo",
    select: "text sender",
    populate: { path: "sender", select: "name" },
  });
}

function publishMessageUpdate(message, senderId, recipientId) {
  const senderView = formatMessage(message, senderId);
  const recipientView = formatMessage(message, recipientId);
  publishMessageEvent(senderId, "message_update", { conversationId: String(recipientId), message: senderView });
  publishMessageEvent(recipientId, "message_update", { conversationId: String(senderId), message: recipientView });
  return senderView;
}

export async function listMessageInbox(userId) {
  const messages = await Message.find({ $or: [{ sender: userId }, { recipient: userId }] })
    .sort({ createdAt: -1 }).limit(1000).populate("sender", userFields).populate("recipient", userFields).lean();
  const conversations = new Map();
  for (const message of messages) {
    const isSender = String(message.sender?._id) === String(userId);
    const other = isSender ? message.recipient : message.sender;
    if (!other?._id) continue;
    const otherId = String(other._id);
    const current = conversations.get(otherId) || {
      userId: otherId,
      name: other.name,
      photo: other.photo || "",
      role: [other.course, other.year, other.university].filter(Boolean).join(" · ") || other.headline || "Connectly student",
      lastMessage: message.text,
      lastMessageAt: message.createdAt,
      unreadCount: 0,
    };
    if (!isSender && !message.readAt) current.unreadCount += 1;
    conversations.set(otherId, current);
  }
  return [...conversations.values()];
}

export async function listMessagePresence(userId) {
  const acceptedConnections = await Follow.find({ status: "accepted", $or: [{ from: userId }, { to: userId }] }).select("from to").lean();
  const userIds = acceptedConnections.map((connection) => String(connection.from) === String(userId) ? connection.to : connection.from);
  if (!userIds.length) return [];
  const [users, onlineIds] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("lastSeenAt").lean(),
    Promise.resolve(new Set(getOnlineMessageUserIds())),
  ]);
  const seenById = new Map(users.map((user) => [String(user._id), user.lastSeenAt || null]));
  return userIds.map((id) => ({ userId: String(id), online: onlineIds.has(String(id)), lastSeenAt: onlineIds.has(String(id)) ? null : seenById.get(String(id)) || null }));
}

export async function publishTypingStatus({ user, otherUserId }) {
  await ensureConnected(user._id, otherUserId);
  publishMessageEvent(otherUserId, "typing", { conversationId: String(user._id), typing: true });
}

export async function listMessageThread({ userId, otherUserId }) {
  await ensureConnected(userId, otherUserId);
  const filter = { $or: [{ sender: userId, recipient: otherUserId }, { sender: otherUserId, recipient: userId }] };
  const readAt = new Date();
  const readResult = await Message.updateMany({ sender: otherUserId, recipient: userId, readAt: null }, { $set: { readAt } });
  if (readResult.modifiedCount > 0) publishMessageEvent(otherUserId, "read", { conversationId: String(userId), readAt });
  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(300)
    .populate("sender", "name photo")
    .populate({ path: "replyTo", select: "text sender", populate: { path: "sender", select: "name" } })
    .lean();
  return messages.map((message) => formatMessage(message, userId));
}

export async function createMessage({ user, otherUserId, text, replyToId }) {
  await ensureConnected(user._id, otherUserId);
  let replyTo = null;
  if (replyToId) {
    replyTo = await Message.findOne({
      _id: replyToId,
      $or: [{ sender: user._id, recipient: otherUserId }, { sender: otherUserId, recipient: user._id }],
    });
    if (!replyTo) throw httpError(404, "The message you are replying to could not be found.");
  }
  const message = await Message.create({ sender: user._id, recipient: otherUserId, text, replyTo: replyTo?._id || null });
  await message.populate("sender", "name");
  await populateMessage(message);
  const senderView = formatMessage(message, user._id);
  const recipientView = formatMessage(message, otherUserId);
  const senderProfile = { id: String(user._id), name: user.name || "Student", photo: user.photo || "" };
  publishMessageEvent(user._id, "message", { conversationId: String(otherUserId), message: senderView, sender: senderProfile });
  publishMessageEvent(otherUserId, "message", { conversationId: String(user._id), message: recipientView, sender: senderProfile });
  return senderView;
}

export async function editMessage({ user, otherUserId, messageId, text }) {
  await ensureConnected(user._id, otherUserId);
  const message = await Message.findOneAndUpdate(
    { _id: messageId, sender: user._id, recipient: otherUserId },
    { $set: { text, editedAt: new Date() } },
    { new: true, runValidators: true },
  ).populate("sender", "name");
  if (!message) throw httpError(404, "Message not found or you cannot edit it.");
  await populateMessage(message);
  return publishMessageUpdate(message, user._id, otherUserId);
}

export async function deleteMessage({ user, otherUserId, messageId }) {
  await ensureConnected(user._id, otherUserId);
  const message = await Message.findOneAndDelete({ _id: messageId, sender: user._id, recipient: otherUserId });
  if (!message) throw httpError(404, "Message not found or you cannot delete it.");
  const event = { conversationId: String(otherUserId), messageId: String(message._id) };
  publishMessageEvent(user._id, "message_delete", event);
  publishMessageEvent(otherUserId, "message_delete", { ...event, conversationId: String(user._id) });
  return { id: String(message._id) };
}

export async function toggleMessageReaction({ user, otherUserId, messageId, emoji }) {
  await ensureConnected(user._id, otherUserId);
  const message = await Message.findOne({
    _id: messageId,
    $or: [{ sender: user._id, recipient: otherUserId }, { sender: otherUserId, recipient: user._id }],
  }).populate("sender", "name");
  if (!message) throw httpError(404, "Message not found.");
  const existingIndex = message.reactions.findIndex((reaction) => String(reaction.user) === String(user._id));
  if (existingIndex >= 0 && message.reactions[existingIndex].emoji === emoji) message.reactions.splice(existingIndex, 1);
  else if (existingIndex >= 0) message.reactions[existingIndex].emoji = emoji;
  else message.reactions.push({ user: user._id, emoji });
  await message.save();
  await populateMessage(message);
  return publishMessageUpdate(message, user._id, otherUserId);
}
