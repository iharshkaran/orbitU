const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}, includeMetadata = false) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Could not connect to OrbitU. Please try again.");
  return includeMetadata ? body : body.data ?? body;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  sendSignupCode: (payload) => request("/auth/signup/send-code", { method: "POST", body: JSON.stringify(payload) }),
  verifySignupCode: (payload) => request("/auth/signup/verify-code", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  updateProfile: (payload) => {
    const fields = ["name", "headline", "university", "course", "year", "location", "bio", "skills", "photo", "banner", "projects", "education", "featured", "portfolioUrl"];
    const profile = Object.fromEntries(fields.filter((field) => field in payload).map((field) => [field, payload[field]]));
    return request("/users/me", { method: "PATCH", body: JSON.stringify(profile) });
  },
  users: (query = "", page = 1, limit = 12) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query) params.set("q", query);
    return request(`/users?${params.toString()}`, {}, true);
  },
  user: (id) => request(`/users/${encodeURIComponent(id)}`),
  userPosts: (id, page = 1, limit = 50) => request(`/users/${encodeURIComponent(id)}/posts?page=${page}&limit=${limit}`),
  userPostsWithMeta: (id, page = 1, limit = 50) => request(`/users/${encodeURIComponent(id)}/posts?page=${page}&limit=${limit}`, {}, true),
  connections: () => request("/connections"),
  requestConnection: (id) => request(`/users/${id}/connections`, { method: "POST" }),
  respondConnection: (id, action) => request(`/connections/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
  removeConnection: (id) => request(`/connections/${id}`, { method: "DELETE" }),
  posts: (page = 1, limit = 10) => request(`/posts?page=${page}&limit=${limit}`, {}, true),
  collaborationProjects: (query = "") => request(`/projects${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  myCollaborationProjects: () => request("/projects/mine"),
  joinedCollaborationProjects: () => request("/projects/teams"),
  pendingProjectRequestCount: () => request("/projects/requests/count"),
  projectInvitations: () => request("/projects/invitations"),
  createCollaborationProject: (payload) => request("/projects", { method: "POST", body: JSON.stringify(payload) }),
  updateCollaborationProject: (id, payload) => request(`/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCollaborationProject: (id) => request(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
  requestToJoinProject: (id, message) => request(`/projects/${encodeURIComponent(id)}/requests`, { method: "POST", body: JSON.stringify({ message }) }),
  decideProjectRequest: (id, requestId, action) => request(`/projects/${encodeURIComponent(id)}/requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: JSON.stringify({ action }) }),
  inviteProjectTeammate: (projectId, inviteeId) => request(`/projects/${encodeURIComponent(projectId)}/invitations/${encodeURIComponent(inviteeId)}`, { method: "POST" }),
  decideProjectInvitation: (projectId, invitationId, action) => request(`/projects/${encodeURIComponent(projectId)}/invitations/${encodeURIComponent(invitationId)}`, { method: "PATCH", body: JSON.stringify({ action }) }),
  projectWorkspace: (id) => request(`/projects/${encodeURIComponent(id)}/workspace`),
  removeProjectTeammate: (id, memberId) => request(`/projects/${encodeURIComponent(id)}/members/${encodeURIComponent(memberId)}`, { method: "DELETE" }),
  addProjectResource: (id, payload) => request(`/projects/${encodeURIComponent(id)}/resources`, { method: "POST", body: JSON.stringify(payload) }),
  removeProjectResource: (id, resourceId) => request(`/projects/${encodeURIComponent(id)}/resources/${encodeURIComponent(resourceId)}`, { method: "DELETE" }),
  createProjectMilestone: (id, payload) => request(`/projects/${encodeURIComponent(id)}/milestones`, { method: "POST", body: JSON.stringify(payload) }),
  updateProjectMilestone: (id, milestoneId, payload) => request(`/projects/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProjectMilestone: (id, milestoneId) => request(`/projects/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}`, { method: "DELETE" }),
  createProjectTask: (id, payload) => request(`/projects/${encodeURIComponent(id)}/tasks`, { method: "POST", body: JSON.stringify(payload) }),
  updateProjectTask: (id, taskId, payload) => request(`/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProjectTask: (id, taskId) => request(`/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }),
  post: (id) => request(`/posts/${encodeURIComponent(id)}`),
  postComments: (id) => request(`/posts/${encodeURIComponent(id)}/comments`),
  createPost: (payload) => request("/posts", { method: "POST", body: JSON.stringify(payload) }),
  updatePost: (id, payload) => request(`/posts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  toggleLike: (id) => request(`/posts/${id}/like`, { method: "POST" }),
  postLikes: (id) => request(`/posts/${encodeURIComponent(id)}/likes`),
  comment: (id, text) => request(`/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),
  replyToComment: (postId, parentId, text) => request(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: JSON.stringify({ text, parentId }) }),
  updateComment: (postId, commentId, text) => request(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: "PATCH", body: JSON.stringify({ text }) }),
  deleteComment: (postId, commentId) => request(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" }),
  notifications: () => request("/notifications"),
  markNotificationsRead: (id) => request("/notifications/read", { method: "PATCH", body: JSON.stringify(id ? { id } : {}) }),
  dismissNotification: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
  messageInbox: () => request("/messages"),
  messagePresence: () => request("/messages/presence"),
  messageTyping: (userId) => request(`/messages/typing/${encodeURIComponent(userId)}`, { method: "POST", body: "{}" }),
  messageThread: (userId) => request(`/messages/${encodeURIComponent(userId)}`),
  sendMessage: (userId, payload, replyToId) => request(`/messages/${encodeURIComponent(userId)}`, { method: "POST", body: JSON.stringify(typeof payload === "string" ? { text: payload, ...(replyToId ? { replyToId } : {}) } : payload) }),
  editMessage: (userId, messageId, text) => request(`/messages/${encodeURIComponent(userId)}/${encodeURIComponent(messageId)}`, { method: "PATCH", body: JSON.stringify({ text }) }),
  deleteMessage: (userId, messageId) => request(`/messages/${encodeURIComponent(userId)}/${encodeURIComponent(messageId)}`, { method: "DELETE" }),
  toggleMessageReaction: (userId, messageId, emoji) => request(`/messages/${encodeURIComponent(userId)}/${encodeURIComponent(messageId)}/reaction`, { method: "PUT", body: JSON.stringify({ emoji }) }),
  imagekitAuth: () => request("/uploads/imagekit/auth"),
};




