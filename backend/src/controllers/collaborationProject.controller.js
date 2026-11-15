import { addProjectResource, countPendingProjectRequests, createCollaborationProject, createProjectMilestone, createProjectTask, decideProjectInvitation, decideProjectRequest, deleteCollaborationProject, deleteProjectMilestone, deleteProjectResource, deleteProjectTask, getCollaborationWorkspace, inviteProjectTeammate, listProjectInvitations, listCollaborationProjects, listJoinedCollaborationProjects, listMyCollaborationProjects, removeProjectTeammate, requestToJoinProject, updateCollaborationProject, updateProjectMilestone, updateProjectTask } from "../services/collaborationProject.service.js";

export async function getProjectInvitations(req, res) {
  const invitations = await listProjectInvitations({ userId: req.user._id });
  return res.json({ success: true, data: invitations });
}

export async function inviteTeammate(req, res) {
  const result = await inviteProjectTeammate({ projectId: req.params.id, inviterId: req.user._id, inviteeId: req.params.inviteeId });
  return res.status(201).json({ success: true, data: result });
}

export async function respondProjectInvitation(req, res) {
  const result = await decideProjectInvitation({ projectId: req.params.id, invitationId: req.params.invitationId, userId: req.user._id, action: req.validated.action });
  return res.json({ success: true, data: result });
}

export async function addWorkspaceResource(req, res) {
  const workspace = await addProjectResource({ projectId: req.params.id, userId: req.user._id, data: req.validated });
  return res.status(201).json({ success: true, data: workspace });
}

export async function removeWorkspaceResource(req, res) {
  const workspace = await deleteProjectResource({ projectId: req.params.id, resourceId: req.params.resourceId, userId: req.user._id });
  return res.json({ success: true, data: workspace });
}

export async function removeTeammate(req, res) {
  const workspace = await removeProjectTeammate({ projectId: req.params.id, memberId: req.params.memberId, ownerId: req.user._id });
  return res.json({ success: true, data: workspace });
}

export async function getPendingProjectRequestCount(req, res) {
  const count = await countPendingProjectRequests({ userId: req.user._id });
  return res.json({ success: true, data: { count } });
}

export async function getCollaborationProjects(req, res) {
  const projects = await listCollaborationProjects({ userId: req.user._id, query: req.validated.q });
  return res.json({ success: true, data: projects });
}

export async function getMyCollaborationProjects(req, res) {
  const projects = await listMyCollaborationProjects({ userId: req.user._id });
  return res.json({ success: true, data: projects });
}

export async function getJoinedCollaborationProjects(req, res) {
  const projects = await listJoinedCollaborationProjects({ userId: req.user._id });
  return res.json({ success: true, data: projects });
}

export async function getWorkspace(req, res) {
  const workspace = await getCollaborationWorkspace({ projectId: req.params.id, userId: req.user._id });
  return res.json({ success: true, data: workspace });
}

export async function addMilestone(req, res) {
  const workspace = await createProjectMilestone({ projectId: req.params.id, userId: req.user._id, data: req.validated });
  return res.status(201).json({ success: true, data: workspace });
}

export async function editMilestone(req, res) {
  const workspace = await updateProjectMilestone({ projectId: req.params.id, milestoneId: req.params.milestoneId, userId: req.user._id, data: req.validated });
  return res.json({ success: true, data: workspace });
}

export async function removeMilestone(req, res) {
  const workspace = await deleteProjectMilestone({ projectId: req.params.id, milestoneId: req.params.milestoneId, userId: req.user._id });
  return res.json({ success: true, data: workspace });
}

export async function addTask(req, res) {
  const workspace = await createProjectTask({ projectId: req.params.id, userId: req.user._id, data: req.validated });
  return res.status(201).json({ success: true, data: workspace });
}

export async function editTask(req, res) {
  const workspace = await updateProjectTask({ projectId: req.params.id, taskId: req.params.taskId, userId: req.user._id, data: req.validated });
  return res.json({ success: true, data: workspace });
}

export async function removeTask(req, res) {
  const workspace = await deleteProjectTask({ projectId: req.params.id, taskId: req.params.taskId, userId: req.user._id });
  return res.json({ success: true, data: workspace });
}

export async function addCollaborationProject(req, res) {
  const project = await createCollaborationProject({ ownerId: req.user._id, data: req.validated });
  return res.status(201).json({ success: true, data: project });
}

export async function editCollaborationProject(req, res) {
  const project = await updateCollaborationProject({ projectId: req.params.id, ownerId: req.user._id, data: req.validated });
  return res.json({ success: true, data: project });
}

export async function removeCollaborationProject(req, res) {
  const result = await deleteCollaborationProject({ projectId: req.params.id, ownerId: req.user._id });
  return res.json({ success: true, data: result });
}

export async function applyToProject(req, res) {
  const result = await requestToJoinProject({ projectId: req.params.id, userId: req.user._id, message: req.validated.message });
  return res.status(201).json({ success: true, data: result });
}

export async function handleProjectRequest(req, res) {
  const result = await decideProjectRequest({ projectId: req.params.id, requestId: req.params.requestId, ownerId: req.user._id, action: req.validated.action });
  return res.json({ success: true, data: result });
}
