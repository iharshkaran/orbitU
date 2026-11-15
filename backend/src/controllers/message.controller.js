import { createMessage, listMessageInbox, listMessageThread } from "../services/message.service.js";
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

export async function getThread(req, res) {
  const messages = await listMessageThread({ userId: req.user._id, otherUserId: req.params.userId });
  return res.json({ success: true, data: messages });
}

export async function sendMessage(req, res) {
  const message = await createMessage({ user: req.user, otherUserId: req.params.userId, text: req.validated.text });
  return res.status(201).json({ success: true, data: message });
}
