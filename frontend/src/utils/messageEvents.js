const API_BASE = import.meta.env.VITE_API_URL || "/api";
const listeners = new Set();
let eventSource = null;

function dispatch(type, event) {
  try {
    const data = JSON.parse(event.data);
    listeners.forEach((listener) => listener({ type, data }));
  } catch {
    // Ignore malformed event payloads and keep the stream alive.
  }
}

function connect() {
  if (eventSource || listeners.size === 0 || typeof EventSource === "undefined") return;
  eventSource = new EventSource(`${API_BASE}/messages/events`, { withCredentials: true });
  eventSource.addEventListener("message", (event) => dispatch("message", event));
  eventSource.addEventListener("read", (event) => dispatch("read", event));
}

export function subscribeMessageEvents(listener) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
