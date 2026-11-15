import { createMessage, deleteMessage, editMessage, listMessageInbox, listMessagePresence, listMessageThread, publishTypingStatus, toggleMessageReaction } from "../services/message.service.js";
import { subscribeToMessageEvents } from "../services/messageEvents.service.js";

export function streamMessageEvents(req, res) {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(": connected\n\n");
  const unsubscribe = subscribeToMessageEvents(req.user._id, res);
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
  res.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

export async function getInbox(req, res) {
  const inbox = await listMessageInbox(req.user._id);
  return res.json({ success: true, data: inbox });
}

export async function getPresence(req, res) {
  const presence = await listMessagePresence(req.user._id);
  return res.json({ success: true, data: presence });
}

export async function getThread(req, res) {
  const messages = await listMessageThread({ userId: req.user._id, otherUserId: req.params.userId });
  return res.json({ success: true, data: messages });
}

export async function sendMessage(req, res) {
  const message = await createMessage({ user: req.user, otherUserId: req.params.userId, ...req.validated });
  return res.status(201).json({ success: true, data: message });
}

export async function updateMessage(req, res) {
  const message = await editMessage({ user: req.user, otherUserId: req.params.userId, messageId: req.params.messageId, text: req.validated.text });
  return res.json({ success: true, data: message });
}

export async function removeMessage(req, res) {
  const result = await deleteMessage({ user: req.user, otherUserId: req.params.userId, messageId: req.params.messageId });
  return res.json({ success: true, data: result });
}

export async function reactToMessage(req, res) {
  const result = await toggleMessageReaction({ user: req.user, otherUserId: req.params.userId, messageId: req.params.messageId, emoji: req.validated.emoji });
  return res.json({ success: true, data: result });
}

export async function sendTyping(req, res) {
  await publishTypingStatus({ user: req.user, otherUserId: req.params.userId });
  return res.status(204).end();
}
