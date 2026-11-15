const streamsByUser = new Map();

export function subscribeToMessageEvents(userId, response) {
  const key = String(userId);
  const streams = streamsByUser.get(key) || new Set();
  streams.add(response);
  streamsByUser.set(key, streams);

  return () => {
    streams.delete(response);
    if (streams.size === 0) streamsByUser.delete(key);
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
