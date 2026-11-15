import User from "../models/User.js";

const streamsByUser = new Map();

function publishToAll(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [userId, streams] of streamsByUser) {
    for (const response of streams) {
      try { response.write(payload); }
      catch { streams.delete(response); }
    }
    if (streams.size === 0) streamsByUser.delete(userId);
  }
}

export function subscribeToMessageEvents(userId, response) {
  const key = String(userId);
  const streams = streamsByUser.get(key) || new Set();
  const wasOnline = streams.size > 0;
  streams.add(response);
  streamsByUser.set(key, streams);
  response.write(`event: presence_snapshot\ndata: ${JSON.stringify({ userIds: [...streamsByUser.keys()] })}\n\n`);
  if (!wasOnline) publishToAll("presence", { userId: key, online: true, lastSeenAt: null });

  return () => {
    streams.delete(response);
    if (streams.size === 0) {
      streamsByUser.delete(key);
      const lastSeenAt = new Date();
      User.updateOne({ _id: key }, { $set: { lastSeenAt } }).catch(() => {});
      publishToAll("presence", { userId: key, online: false, lastSeenAt });
    }
  };
}

export function publishMessageEvent(userId, event, data) {
  const streams = streamsByUser.get(String(userId));
  if (!streams) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const response of streams) {
    try {
      response.write(payload);
    } catch {
      streams.delete(response);
    }
  }
  if (streams.size === 0) streamsByUser.delete(String(userId));
}

export function getOnlineMessageUserIds() {
  return [...streamsByUser.keys()];
}
