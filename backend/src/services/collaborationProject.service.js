import CollaborationProject from "../models/CollaborationProject.js";
import Notification from "../models/Notification.js";
import { NOTIFICATION_TYPES } from "../constants/notification.types.js";
import { createNotification } from "./notification.service.js";
import { httpError } from "../utils/httpError.js";

const USER_FIELDS = "name headline course year university photo skills";

function formatProject(project, viewerId) {
  const owner = project.owner || {};
  const requests = (project.requests || []).map((request) => ({
    id: String(request._id),
    message: request.message,
    status: request.status,
    createdAt: request.createdAt,
    applicant: request.user?._id ? {
      id: String(request.user._id), name: request.user.name || "Student", headline: request.user.headline || "Student",
      university: request.user.university || "", photo: request.user.photo || "", skills: request.user.skills || [],
    } : null,
  }));
  const viewerRequest = requests.find((request) => request.applicant?.id === String(viewerId));
  return {
    id: String(project._id), title: project.title, description: project.description,
    skills: project.skills || [], roles: project.roles || [], teamSize: project.teamSize,
    members: (project.members || []).map((member) => ({ id: String(member._id || member), name: member.name || "Student", photo: member.photo || "" })),
    memberCount: (project.members || []).length, status: project.status,
    owner: { id: String(owner._id || owner), name: owner.name || "Student", headline: owner.headline || "Student", university: owner.university || "", photo: owner.photo || "", skills: owner.skills || [] },
    isOwner: String(owner._id || owner) === String(viewerId),
    myRequestStatus: viewerRequest?.status || "",
    requests: String(owner._id || owner) === String(viewerId) ? requests : [],
    createdAt: project.createdAt, updatedAt: project.updatedAt,
  };
}

export async function listCollaborationProjects({ userId, query = "" }) {
  const filter = { status: "open" };
  const searchTerm = String(query || "").trim();
  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ title: new RegExp(escaped, "i") }, { description: new RegExp(escaped, "i") }, { skills: new RegExp(escaped, "i") }, { roles: new RegExp(escaped, "i") }];
  }
  const projects = await CollaborationProject.find(filter).populate("owner", USER_FIELDS).populate("members", "name photo").populate("requests.user", USER_FIELDS).sort({ createdAt: -1 }).limit(50).lean();
  return projects.map((project) => formatProject(project, userId));
}

export async function listMyCollaborationProjects({ userId }) {
  const projects = await CollaborationProject.find({ owner: userId }).populate("owner", USER_FIELDS).populate("members", "name photo").populate("requests.user", USER_FIELDS).sort({ updatedAt: -1 }).limit(50).lean();
  return projects.map((project) => formatProject(project, userId));
}

export async function listJoinedCollaborationProjects({ userId }) {
  const projects = await CollaborationProject.find({ owner: { $ne: userId }, members: userId }).populate("owner", USER_FIELDS).populate("members", "name photo").populate("requests.user", USER_FIELDS).sort({ updatedAt: -1 }).limit(50).lean();
  return projects.map((project) => formatProject(project, userId));
}

async function findWorkspaceForMember({ projectId, userId }) {
  const project = await CollaborationProject.findById(projectId)
    .populate("owner", USER_FIELDS)
    .populate("members", "name photo")
    .populate("requests.user", USER_FIELDS)
    .populate("tasks.assignee", "name photo headline")
    .populate("tasks.createdBy", "name photo")
    .populate("milestones.createdBy", "name photo")
    .populate("activity.actor", "name photo");
  if (!project) throw httpError(404, "Project not found.");
  const isMember = String(project.owner?._id || project.owner) === String(userId) || project.members.some((member) => String(member._id || member) === String(userId));
  if (!isMember) throw httpError(403, "Only project teammates can open this workspace.");
  return project;
}

function formatWorkspace(project, userId) {
  const tasks = project.tasks.map((task) => ({
    id: String(task._id), title: task.title, description: task.description || "", status: task.status,
    assignee: task.assignee?._id ? { id: String(task.assignee._id), name: task.assignee.name, photo: task.assignee.photo || "", headline: task.assignee.headline || "" } : null,
    milestoneId: task.milestone ? String(task.milestone) : "", dueDate: task.dueDate || null,
    createdBy: task.createdBy?._id ? { id: String(task.createdBy._id), name: task.createdBy.name, photo: task.createdBy.photo || "" } : null,
    createdAt: task.createdAt, updatedAt: task.updatedAt,
  }));
  const milestones = project.milestones.map((milestone) => ({
    id: String(milestone._id), title: milestone.title, dueDate: milestone.dueDate || null, status: milestone.status,
    createdBy: milestone.createdBy?._id ? { id: String(milestone.createdBy._id), name: milestone.createdBy.name, photo: milestone.createdBy.photo || "" } : null,
    createdAt: milestone.createdAt,
  }));
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const activity = (project.activity || []).map((item) => ({
    id: String(item._id), actor: item.actor?._id ? { id: String(item.actor._id), name: item.actor.name || "A teammate", photo: item.actor.photo || "" } : null,
    action: item.action, kind: item.kind, title: item.title, summary: item.summary || "", createdAt: item.createdAt,
  }));
  return { project: formatProject(project, userId), tasks, milestones, activity, progress: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0 };
}

function recordProjectActivity(project, { actorId, action, kind, title, summary = "" }) {
  project.activity.unshift({ actor: actorId, action, kind, title, summary });
  if (project.activity.length > 100) project.activity.splice(100);
}

async function notifyProjectTeammates(project, actorId, { kind, action, title, summary = "" }) {
  const recipients = new Set([String(project.owner?._id || project.owner), ...project.members.map((member) => String(member._id || member))]);
  const actionText = action === "created" ? "added" : action === "deleted" ? "removed" : action === "status_changed" ? "changed the status of" : action === "assigned" ? "updated the assignee for" : "updated";
  const message = `${actionText} ${kind} “${title}” in ${project.title}${summary ? ` · ${summary}` : ""}.`.slice(0, 300);
  await Promise.allSettled([...recipients].filter((recipient) => recipient !== String(actorId)).map((recipient) => createNotification({
    recipient, actor: actorId, type: NOTIFICATION_TYPES.PROJECT, message, project: project._id,
  })));
}

function dateKey(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

const TASK_STATUS_LABELS = { backlog: "To do", in_progress: "In progress", done: "Done" };

export async function getCollaborationWorkspace({ projectId, userId }) {
  return formatWorkspace(await findWorkspaceForMember({ projectId, userId }), userId);
}

export async function createProjectMilestone({ projectId, userId, data }) {
  const project = await findWorkspaceForMember({ projectId, userId });
  project.milestones.push({ title: data.title, dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null, createdBy: userId });
  recordProjectActivity(project, { actorId: userId, action: "created", kind: "milestone", title: data.title });
  await project.save();
  await notifyProjectTeammates(project, userId, { action: "created", kind: "milestone", title: data.title });
  return getCollaborationWorkspace({ projectId, userId });
}

export async function updateProjectMilestone({ projectId, milestoneId, userId, data }) {
  const project = await findWorkspaceForMember({ projectId, userId });
  const milestone = project.milestones.id(milestoneId);
  if (!milestone) throw httpError(404, "Milestone not found.");
  const changes = [];
  const originalTitle = milestone.title;
  const activityTitle = data.title || originalTitle;
  if (data.title !== undefined && milestone.title !== data.title) { milestone.title = data.title; changes.push("title changed"); }
  if (data.dueDate !== undefined && dateKey(milestone.dueDate) !== data.dueDate) { milestone.dueDate = data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null; changes.push(data.dueDate ? `due date set to ${data.dueDate}` : "due date cleared"); }
  let action = "updated";
  if (data.status !== undefined && milestone.status !== data.status) {
    milestone.status = data.status;
    changes.push(data.status === "completed" ? "marked complete" : "reopened");
    action = "status_changed";
  }
  if (!changes.length) return getCollaborationWorkspace({ projectId, userId });
  const summary = changes.join(", ");
  recordProjectActivity(project, { actorId: userId, action, kind: "milestone", title: activityTitle, summary });
  await project.save();
  await notifyProjectTeammates(project, userId, { action, kind: "milestone", title: activityTitle, summary });
  return getCollaborationWorkspace({ projectId, userId });
}

export async function deleteProjectMilestone({ projectId, milestoneId, userId }) {
  const project = await findWorkspaceForMember({ projectId, userId });
  const milestone = project.milestones.id(milestoneId);
  if (!milestone) throw httpError(404, "Milestone not found.");
  const title = milestone.title;
  project.tasks.forEach((task) => {
    if (String(task.milestone || "") === String(milestoneId)) task.milestone = null;
  });
  project.milestones.pull(milestoneId);
  recordProjectActivity(project, { actorId: userId, action: "deleted", kind: "milestone", title, summary: "linked tasks were kept and detached" });
  await project.save();
  await notifyProjectTeammates(project, userId, { action: "deleted", kind: "milestone", title, summary: "linked tasks were kept and detached" });
  return getCollaborationWorkspace({ projectId, userId });
}

export async function createProjectTask({ projectId, userId, data }) {
  const project = await findWorkspaceForMember({ projectId, userId });
  const memberIds = new Set([String(project.owner?._id || project.owner), ...project.members.map((member) => String(member._id || member))]);
  if (data.assigneeId && !memberIds.has(data.assigneeId)) throw httpError(400, "Assign tasks to a member of this project.");
  if (data.milestoneId && !project.milestones.id(data.milestoneId)) throw httpError(400, "Choose a milestone from this project.");
  project.tasks.push({
    title: data.title, description: data.description, status: "backlog",
    assignee: data.assigneeId || null, milestone: data.milestoneId || null,
    dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null, createdBy: userId,
  });
  recordProjectActivity(project, { actorId: userId, action: "created", kind: "task", title: data.title });
  await project.save();
  await notifyProjectTeammates(project, userId, { action: "created", kind: "task", title: data.title });
  return getCollaborationWorkspace({ projectId, userId });
}

export async function updateProjectTask({ projectId, taskId, userId, data }) {
  const project = await findWorkspaceForMember({ projectId, userId });
  const task = project.tasks.id(taskId);
  if (!task) throw httpError(404, "Task not found.");
  const changes = [];
  const originalTitle = task.title;
  const activityTitle = data.title || originalTitle;
  if (data.title !== undefined && task.title !== data.title) { task.title = data.title; changes.push("title changed"); }
  if (data.description !== undefined && task.description !== data.description) { task.description = data.description; changes.push("details changed"); }
  if (data.dueDate !== undefined && dateKey(task.dueDate) !== data.dueDate) { task.dueDate = data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null; changes.push(data.dueDate ? `due date set to ${data.dueDate}` : "due date cleared"); }
  let action = "updated";
  if (data.assigneeId !== undefined) {
    const memberIds = new Set([String(project.owner?._id || project.owner), ...project.members.map((member) => String(member._id || member))]);
    if (data.assigneeId && !memberIds.has(data.assigneeId)) throw httpError(400, "Assign tasks to a member of this project.");
    const currentAssignee = String(task.assignee?._id || task.assignee || "");
    if (currentAssignee !== data.assigneeId) {
      task.assignee = data.assigneeId || null;
      changes.push(data.assigneeId ? "assignee changed" : "assignee cleared");
      action = "assigned";
    }
  }
  if (data.milestoneId !== undefined) {
    if (data.milestoneId && !project.milestones.id(data.milestoneId)) throw httpError(400, "Choose a milestone from this project.");
    const currentMilestone = String(task.milestone || "");
    if (currentMilestone !== data.milestoneId) { task.milestone = data.milestoneId || null; changes.push(data.milestoneId ? "milestone changed" : "milestone cleared"); }
  }
  if (data.status && task.status !== data.status) {
    changes.push(`status changed from ${TASK_STATUS_LABELS[task.status]} to ${TASK_STATUS_LABELS[data.status]}`);
    task.status = data.status;
    action = "status_changed";
  }
  if (!changes.length) return getCollaborationWorkspace({ projectId, userId });
  const summary = changes.join(", ");
  recordProjectActivity(project, { actorId: userId, action, kind: "task", title: activityTitle, summary });
  await project.save();
  await notifyProjectTeammates(project, userId, { action, kind: "task", title: activityTitle, summary });
  return getCollaborationWorkspace({ projectId, userId });
}

export async function deleteProjectTask({ projectId, taskId, userId }) {
  const project = await findWorkspaceForMember({ projectId, userId });
  const task = project.tasks.id(taskId);
  if (!task) throw httpError(404, "Task not found.");
  const title = task.title;
  project.tasks.pull(taskId);
  recordProjectActivity(project, { actorId: userId, action: "deleted", kind: "task", title });
  await project.save();
  await notifyProjectTeammates(project, userId, { action: "deleted", kind: "task", title });
  return getCollaborationWorkspace({ projectId, userId });
}

export async function countPendingProjectRequests({ userId }) {
  const [result] = await CollaborationProject.aggregate([
    { $match: { owner: userId } },
    { $unwind: "$requests" },
    { $match: { "requests.status": "pending" } },
    { $count: "count" },
  ]);
  return result?.count || 0;
}

export async function createCollaborationProject({ ownerId, data }) {
  const project = await CollaborationProject.create({ ...data, owner: ownerId, members: [ownerId] });
  await project.populate([{ path: "owner", select: USER_FIELDS }, { path: "members", select: "name photo" }]);
  return formatProject(project, ownerId);
}

export async function updateCollaborationProject({ projectId, ownerId, data }) {
  const project = await CollaborationProject.findOne({ _id: projectId, owner: ownerId });
  if (!project) throw httpError(404, "Project not found or you do not manage it.");
  if (data.teamSize !== undefined && data.teamSize < project.members.length) {
    throw httpError(400, `Team size cannot be smaller than the ${project.members.length} current teammates.`);
  }
  Object.assign(project, data);
  if (data.status === "open" && project.members.length >= project.teamSize) project.status = "full";
  await project.save();
  await project.populate([{ path: "owner", select: USER_FIELDS }, { path: "members", select: "name photo" }, { path: "requests.user", select: USER_FIELDS }]);
  return formatProject(project, ownerId);
}

export async function deleteCollaborationProject({ projectId, ownerId }) {
  const project = await CollaborationProject.findOneAndDelete({ _id: projectId, owner: ownerId });
  if (!project) throw httpError(404, "Project not found or you do not manage it.");
  await Notification.deleteMany({ project: project._id });
  return { id: String(project._id), deleted: true };
}

export async function requestToJoinProject({ projectId, userId, message }) {
  const project = await CollaborationProject.findById(projectId);
  if (!project || project.status !== "open") throw httpError(404, "This project is no longer accepting requests.");
  if (String(project.owner) === String(userId)) throw httpError(400, "You already own this project.");
  if (project.members.some((member) => String(member) === String(userId))) throw httpError(409, "You are already a member of this team.");
  const existing = project.requests.find((request) => String(request.user) === String(userId));
  if (existing?.status === "pending" || existing?.status === "accepted") throw httpError(409, "You already have a request for this project.");
  if (existing) { existing.message = message; existing.status = "pending"; }
  else project.requests.push({ user: userId, message, status: "pending" });
  await project.save();
  return { status: "pending" };
}

export async function decideProjectRequest({ projectId, requestId, ownerId, action }) {
  const project = await CollaborationProject.findOne({ _id: projectId, owner: ownerId });
  if (!project) throw httpError(404, "Project not found or you do not manage it.");
  const request = project.requests.id(requestId);
  if (!request || request.status !== "pending") throw httpError(404, "Pending request not found.");
  if (action === "accept") {
    if (project.status === "completed" || project.status === "closed") throw httpError(409, "Reopen this project before accepting another teammate.");
    if (project.members.length >= project.teamSize) throw httpError(409, "Your team is full. Increase team size before accepting another member.");
    request.status = "accepted";
    if (!project.members.some((member) => String(member) === String(request.user))) project.members.push(request.user);
    if (project.members.length >= project.teamSize) project.status = "full";
  } else request.status = "rejected";
  await project.save();
  return { status: request.status, projectStatus: project.status };
}
