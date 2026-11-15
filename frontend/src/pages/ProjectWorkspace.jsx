import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, ExternalLink, FileText, FolderKanban, Link2, LoaderCircle, MessageCircle, Pencil, Plus, Save, Search, Send, Trash2, Upload, UserRound, Users, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { api } from "../utils/api";
import { uploadFileToImageKit } from "../utils/imagekitUpload";

const inputClass = "w-full rounded-xl border-2 border-[#e7dfd0] bg-[#fffdf9] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#858191] focus:border-[#7660dc]";
const taskColumns = [
  { id: "backlog", title: "To do", hint: "Ready to pick up", tone: "bg-[#f4f0e8]", dot: "bg-[#aaa5b3]" },
  { id: "in_progress", title: "In progress", hint: "Being worked on", tone: "bg-[#eee9ff]", dot: "bg-[#6f56d9]" },
  { id: "done", title: "Done", hint: "Completed tasks", tone: "bg-[#e8f7ee]", dot: "bg-[#3b9b69]" },
];
const activityActionLabels = { created: "added", updated: "updated", status_changed: "changed status for", assigned: "updated assignment for", commented: "commented on", deleted: "removed", invited: "invited", joined: "joined", declined_invite: "declined", role_changed: "changed role for", resource_added: "shared", resource_removed: "removed" };

function Avatar({ person, size = "h-9 w-9" }) {
  return <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] text-xs font-bold text-[#5947a8]`}>{person?.photo ? <img src={person.photo} alt="" className="h-full w-full object-cover" /> : person?.name?.slice(0, 1) || <UserRound size={15} />}</span>;
}

function ConnectionPicker({ connections, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef(null);
  const selected = connections.find((connection) => connection.studentId === value);
  const filtered = connections.filter((connection) => `${connection.name} ${connection.role || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return <div ref={pickerRef} className="relative min-w-0 flex-1">
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((current) => !current); setQuery(""); }} className={`${inputClass} flex min-h-11 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}>
      {selected ? <><Avatar person={selected} size="h-7 w-7" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{selected.name}</span><span className="block truncate text-[10px] font-normal text-[#858191]">{selected.role || "OrbitU student"}</span></span></> : <span className="flex-1 text-sm text-[#6e6a7b]">Choose a connection</span>}
      <ChevronDown size={16} className={`shrink-0 text-[#6e6a7b] transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border-2 border-[#191a32] bg-white shadow-[4px_5px_0_#c9bcff]">
      <div className="border-b border-[#e7dfd0] p-2.5"><div className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858191]" /><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connections…" className={`${inputClass} !min-h-9 !py-2 !pl-9 !text-xs`} /></div></div>
      <div role="listbox" aria-label="Choose a connected student" className="max-h-64 overflow-y-auto p-1.5">
        {filtered.length ? filtered.map((connection) => <button key={connection.studentId} type="button" role="option" aria-selected={value === connection.studentId} onClick={() => { onChange(connection.studentId); setOpen(false); setQuery(""); }} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${value === connection.studentId ? "bg-[#eee9ff]" : "hover:bg-[#fff9e8]"}`}><Avatar person={connection} size="h-9 w-9" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#17182d]">{connection.name}</span><span className="mt-0.5 block truncate text-[10px] text-[#6e6a7b]">{connection.role || "OrbitU student"}</span></span>{value === connection.studentId && <Check size={15} className="shrink-0 text-[#6f56d9]" />}</button>) : <p className="px-3 py-5 text-center text-xs text-[#858191]">No matching connections found.</p>}
      </div>
    </div>}
  </div>;
}

function TaskStatusPicker({ value, onChange, disabled, taskTitle }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const selected = taskColumns.find((column) => column.id === value) || taskColumns[0];
  const selectedTone = value === "done"
    ? "border-[#bfe5cd] bg-[#e8f7ee] text-[#28734d]"
    : value === "in_progress"
      ? "border-[#d9cffb] bg-[#f2efff] text-[#5947a8]"
      : "border-[#e7dfd0] bg-[#fffaf0] text-[#625c6e]";

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return <div ref={pickerRef} className="relative z-10 shrink-0" onClick={(event) => event.stopPropagation()}>
    <button type="button" disabled={disabled} aria-label={`Move ${taskTitle} to status`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`inline-flex min-h-10 min-w-[118px] items-center justify-between gap-2 rounded-xl border px-3 text-xs font-bold shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55 ${selectedTone}`}>
      <span className="inline-flex min-w-0 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} /><span className="truncate">{selected.title}</span></span>
      <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="listbox" aria-label={`Status for ${taskTitle}`} className="absolute right-0 top-[calc(100%+7px)] z-50 min-w-[168px] overflow-hidden rounded-2xl border-2 border-[#191a32] bg-white p-1.5 shadow-[4px_5px_0_#c9bcff]">
      {taskColumns.map((column) => <button key={column.id} type="button" role="option" aria-selected={value === column.id} onClick={() => { onChange(column.id); setOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${value === column.id ? "bg-[#f4f0ff]" : "hover:bg-[#fff9e8]"}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.dot}`} />
        <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[#17182d]">{column.title}</span><span className="mt-0.5 block text-[10px] text-[#858191]">{column.hint}</span></span>
        {value === column.id && <Check size={14} className="shrink-0 text-[#6f56d9]" />}
      </button>)}
    </div>}
  </div>;
}

function dateLabel(value) {
  if (!value) return "No due date";
  const dateOnly = String(value).slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(value, status) {
  if (!value || status !== "upcoming") return false;
  const dueDate = String(value).slice(0, 10);
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  return dueDate < todayKey;
}

function isTaskOverdue(value, status) {
  if (!value || status === "done") return false;
  const dueDate = String(value).slice(0, 10);
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  return dueDate < todayKey;
}

function activityTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const location = useLocation();
  const workspaceSections = [
    { id: "details", label: "Overview", description: "Project snapshot", icon: FileText },
    { id: "team", label: "Team", description: "Members and roles", icon: Users },
    { id: "resources", label: "Resources", description: "Shared files and links", icon: Link2 },
    { id: "milestones", label: "Milestones", description: "Goals and deadlines", icon: CheckCircle2 },
    { id: "timeline", label: "Timeline", description: "Milestones and dates", icon: CalendarDays },
    { id: "kanban", label: "Kanban board", description: "Tasks and progress", icon: FolderKanban },
    { id: "activity", label: "Activity", description: "Recent team updates", icon: Clock3 },
  ];
  const routeSection = location.pathname.split("/").filter(Boolean).at(-1);
  const activeSection = workspaceSections.some((section) => section.id === routeSection) ? routeSection : "details";
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loadedProjectId, setLoadedProjectId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeTaskColumn, setActiveTaskColumn] = useState("backlog");
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState("");
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState("");
  const [confirmDeleteMilestoneId, setConfirmDeleteMilestoneId] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigneeId: "", milestoneId: "", dueDate: "" });
  const [taskCommentDrafts, setTaskCommentDrafts] = useState({});
  const [editTaskForm, setEditTaskForm] = useState({ title: "", description: "", status: "backlog", assigneeId: "", milestoneId: "", dueDate: "" });
  const [milestoneForm, setMilestoneForm] = useState({ title: "", dueDate: "" });
  const [editMilestoneForm, setEditMilestoneForm] = useState({ title: "", dueDate: "", status: "upcoming" });
  const [inviteeId, setInviteeId] = useState("");
  const [resourceForm, setResourceForm] = useState({ title: "", url: "" });
  const [resourceMode, setResourceMode] = useState("link");
  const [resourceFile, setResourceFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    api.projectWorkspace(id)
      .then((data) => { if (active) { setWorkspace(data); setActiveTaskColumn(taskColumns.find((column) => data.tasks?.some((task) => task.status === column.id))?.id || "backlog"); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadedProjectId(id); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    api.connections().then((data) => { if (active) setConnections(data.connected || []); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const loading = loadedProjectId !== id;

  async function perform(key, action) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(key);
    setError("");
    try {
      const result = await action();
      setWorkspace(result);
      window.dispatchEvent(new Event("connectly:backend-update"));
      return true;
    } catch (requestError) {
      setError(requestError.message || "Could not update this workspace.");
      return false;
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }

  async function submitTask(event) {
    event.preventDefault();
    const saved = await perform("task", () => api.createProjectTask(id, taskForm));
    if (saved) { setTaskForm({ title: "", description: "", assigneeId: "", milestoneId: "", dueDate: "" }); setShowTaskForm(false); setActiveTaskColumn("backlog"); }
  }

  function startEditTask(task) {
    setEditingTaskId(task.id);
    setConfirmDeleteId("");
    setEditTaskForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      assigneeId: task.assignee?.id || "",
      milestoneId: task.milestoneId || "",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "",
    });
  }

  async function submitTaskEdit(event, taskId) {
    event.preventDefault();
    const saved = await perform(`edit-task-${taskId}`, () => api.updateProjectTask(id, taskId, editTaskForm));
    if (saved) { setEditingTaskId(""); setActiveTaskColumn(editTaskForm.status); }
  }

  async function changeTaskStatus(taskId, status) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    const saved = await perform(`status-task-${taskId}`, () => api.updateProjectTask(id, taskId, { status }));
    if (saved) setActiveTaskColumn(status);
  }

  function startTaskDrag(event, task) {
    if (busy || editingTaskId || confirmDeleteId || event.target.closest("button, input, textarea, select, summary, details, a")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
    setDraggedTaskId(task.id);
  }

  function allowTaskDrop(event, columnId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  }

  async function dropTask(event, columnId) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId("");
    setDragOverColumn("");
    if (taskId) await changeTaskStatus(taskId, columnId);
  }

  async function deleteTask(taskId) {
    const deleted = await perform(`delete-task-${taskId}`, () => api.deleteProjectTask(id, taskId));
    if (deleted) setConfirmDeleteId("");
  }

  async function submitTaskComment(event, taskId) {
    event.preventDefault();
    const text = String(taskCommentDrafts[taskId] || "").trim();
    if (!text || text.length > 1000 || !canManageWork) return;
    const saved = await perform(`task-comment-${taskId}`, () => api.addProjectTaskComment(id, taskId, { text }));
    if (saved) setTaskCommentDrafts((current) => ({ ...current, [taskId]: "" }));
  }

  async function removeTaskComment(taskId, commentId) {
    await perform(`delete-task-comment-${commentId}`, () => api.deleteProjectTaskComment(id, taskId, commentId));
  }

  async function submitMilestone(event) {
    event.preventDefault();
    const saved = await perform("milestone", () => api.createProjectMilestone(id, milestoneForm));
    if (saved) { setMilestoneForm({ title: "", dueDate: "" }); setShowMilestoneForm(false); }
  }

  function startEditMilestone(milestone) {
    setEditingMilestoneId(milestone.id);
    setConfirmDeleteMilestoneId("");
    setEditMilestoneForm({ title: milestone.title, dueDate: milestone.dueDate ? String(milestone.dueDate).slice(0, 10) : "", status: milestone.status });
  }

  async function submitMilestoneEdit(event, milestoneId) {
    event.preventDefault();
    const saved = await perform(`edit-milestone-${milestoneId}`, () => api.updateProjectMilestone(id, milestoneId, editMilestoneForm));
    if (saved) setEditingMilestoneId("");
  }

  async function changeMilestoneStatus(milestoneId, status) {
    await perform(`milestone-${milestoneId}`, () => api.updateProjectMilestone(id, milestoneId, { status }));
  }

  async function deleteMilestone(milestoneId) {
    const deleted = await perform(`delete-milestone-${milestoneId}`, () => api.deleteProjectMilestone(id, milestoneId));
    if (deleted) setConfirmDeleteMilestoneId("");
  }

  async function inviteTeammate(event) {
    event.preventDefault();
    if (!inviteeId) return;
    const invited = await perform("invite", async () => {
      await api.inviteProjectTeammate(id, inviteeId);
      return api.projectWorkspace(id);
    });
    if (invited) { setInviteeId(""); window.dispatchEvent(new Event("connectly:backend-update")); }
  }

  async function removeTeammate(memberId) {
    const removed = await perform(`remove-member-${memberId}`, () => api.removeProjectTeammate(id, memberId));
    if (removed) {
      setConfirmRemoveMemberId("");
      window.dispatchEvent(new Event("connectly:backend-update"));
    }
  }

  async function changeMemberRole(memberId, role) {
    const updated = await perform(`role-${memberId}`, () => api.updateProjectMemberRole(id, memberId, role));
    if (updated) window.dispatchEvent(new Event("connectly:backend-update"));
  }

  async function shareResource(event) {
    event.preventDefault();
    if (resourceMode === "file" && !resourceFile) { setError("Choose a file to share."); return; }
    if (resourceMode === "file" && resourceFile.size > 50 * 1024 * 1024) { setError("Choose a file smaller than 50 MB."); return; }
    const shared = await perform("resource", async () => {
      let resource;
      if (resourceMode === "file") {
        setUploadProgress(0);
        const uploaded = await uploadFileToImageKit(resourceFile, "/connectly/project-resources", setUploadProgress);
        resource = { title: resourceForm.title.trim() || resourceFile.name, url: uploaded.url, type: "file", fileName: resourceFile.name, mimeType: resourceFile.type, size: resourceFile.size };
      } else {
        resource = { title: resourceForm.title.trim(), url: resourceForm.url.trim(), type: "link" };
      }
      return api.addProjectResource(id, resource);
    });
    if (shared) { setResourceForm({ title: "", url: "" }); setResourceFile(null); setUploadProgress(0); }
  }

  async function removeResource(resourceId) {
    await perform(`delete-resource-${resourceId}`, () => api.removeProjectResource(id, resourceId));
  }

  const project = workspace?.project;
  const canManageTeam = Boolean(project?.isOwner || project?.myRole === "admin");
  const canManageWork = Boolean(project?.isOwner || ["admin", "member"].includes(project?.myRole));
  const members = useMemo(() => {
    if (!project) return [];
    const people = [project.owner, ...(project.members || [])];
    return people.filter((person, index) => person?.id && people.findIndex((candidate) => candidate?.id === person.id) === index);
  }, [project]);
  const tasks = workspace?.tasks || [];
  const milestones = workspace?.milestones || [];
  const activity = workspace?.activity || [];
  const resources = workspace?.resources || [];
  const invitations = workspace?.invitations || [];
  const timelineItems = [
    ...milestones.map((milestone) => ({
      id: `milestone-${milestone.id}`,
      kind: "Milestone",
      title: milestone.title,
      date: milestone.dueDate,
      status: milestone.status === "completed" ? "Completed" : isOverdue(milestone.dueDate, milestone.status) ? "Overdue" : "Upcoming",
      complete: milestone.status === "completed",
      detail: `${tasks.filter((task) => task.milestoneId === milestone.id).length} linked tasks`,
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: "Task",
      title: task.title,
      date: task.dueDate,
      status: task.status === "done" ? "Completed" : isTaskOverdue(task.dueDate, task.status) ? "Overdue" : task.status === "in_progress" ? "In progress" : "To do",
      complete: task.status === "done",
      detail: task.assignee?.name ? `Assigned to ${task.assignee.name}` : "Unassigned",
    })),
  ].sort((first, second) => {
    const firstDate = first.date ? String(first.date).slice(0, 10) : "9999-12-31";
    const secondDate = second.date ? String(second.date).slice(0, 10) : "9999-12-31";
    return firstDate.localeCompare(secondDate) || first.kind.localeCompare(second.kind) || first.title.localeCompare(second.title);
  });
  const pendingInviteIds = new Set(invitations.filter((invitation) => invitation.status === "pending").map((invitation) => invitation.user?.id));
  const availableConnections = connections.filter((connection) => !members.some((member) => member.id === connection.studentId) && !pendingInviteIds.has(connection.studentId));
  const completedMilestones = milestones.filter((milestone) => milestone.status === "completed").length;

  return <div className="min-h-screen orbit-pattern-bg text-[#17182d]"><Navbar />
    <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8">
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-[#a33b48]">{error}</p>}
      {loading ? <div role="status" className="rounded-[24px] border-2 border-[#191a32] bg-white p-12 text-center text-sm text-[#6e6a7b] shadow-[4px_5px_0_#c9bcff]"><LoaderCircle size={24} className="mx-auto animate-spin text-[#6f56d9]" /><span className="mt-2 block">Loading project workspace…</span></div>
        : !project ? <section className="mx-auto max-w-xl rounded-[24px] border-2 border-[#191a32] bg-white p-8 text-center shadow-[4px_5px_0_#c9bcff]"><FolderKanban size={30} className="mx-auto text-[#6f56d9]" /><h1 className="mt-3 text-xl font-extrabold">Workspace unavailable</h1><p className="mt-2 text-sm text-[#6e6a7b]">Only this project’s owner and accepted teammates can open its workspace.</p><Link to="/projects" className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2.5 text-sm font-bold shadow-[0_2px_0_#191a32]"><ArrowLeft size={15} />Back to projects</Link></section>
          : <>
            <Link to="/projects" className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#514e62] hover:bg-white/70 hover:text-[#5947a8]"><ArrowLeft size={16} />Projects</Link>
            <header className="relative overflow-hidden rounded-[24px] border-2 border-[#191a32] bg-gradient-to-br from-[#f0ecff] via-white to-[#fff9df] p-4 shadow-[3px_4px_0_#c9bcff] sm:p-5">
              <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#c9bcff]/60" />
              <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9cffb] bg-white/85 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]"><FolderKanban size={11} />Project workspace</span>
                  <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{project.title}</h1>
                  <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-5 text-[#514e62]">{project.description}</p>
                  {!!project.skills?.length && <div className="mt-3 flex flex-wrap gap-1.5">{project.skills.map((skill) => <span key={skill} className="rounded-full border border-[#d9cffb] bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-[#5947a8]">{skill}</span>)}</div>}
                </div>
                <div className="grid grid-cols-3 gap-2 lg:min-w-[300px]">
                  <div className="rounded-2xl border border-[#e7dfd0] bg-white/90 px-2.5 py-2.5 text-center sm:px-3"><p className="text-lg font-black leading-5">{workspace.progress}%</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#858191]">Progress</p></div>
                  <div className="rounded-2xl border border-[#e7dfd0] bg-white/90 px-2.5 py-2.5 text-center sm:px-3"><p className="text-lg font-black leading-5">{completedMilestones}/{milestones.length}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#858191]">Milestones</p></div>
                  <div className="rounded-2xl border border-[#e7dfd0] bg-white/90 px-2.5 py-2.5 text-center sm:px-3"><p className="text-lg font-black leading-5">{members.length}/{project.teamSize}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#858191]">Team</p></div>
                </div>
              </div>
              <div className="relative z-10 mt-4 flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/90"><div className="h-full rounded-full bg-[#6f56d9] transition-all" style={{ width: `${workspace.progress}%` }} /></div>
                <span className="shrink-0 text-[10px] font-bold text-[#6e6a7b]">{workspace.progress}% complete</span>
              </div>
              <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#d9cffb] pt-3">
                <div className="flex items-center gap-2"><div className="flex -space-x-2">{members.slice(0, 5).map((member) => <span key={member.id} title={member.name} className="rounded-full ring-2 ring-white"><Avatar person={member} size="h-7 w-7" /></span>)}</div><span className="text-[11px] text-[#6e6a7b]">{members.length} {members.length === 1 ? "teammate" : "teammates"}</span></div>
                <div className="flex flex-wrap gap-1.5">{project.roles?.slice(0, 3).map((role) => <span key={role} className="rounded-full bg-[#fff3b7] px-2.5 py-1 text-[9px] font-bold text-[#715b00]">{role}</span>)}</div>
              </div>
            </header>

            <div className="mt-4 grid gap-4 lg:grid-cols-[205px_minmax(0,1fr)] lg:items-start">
              <div className="rounded-2xl border-2 border-[#191a32] bg-white p-2 shadow-[3px_4px_0_#c9bcff] lg:hidden">
                <nav aria-label="Project workspace sections" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {workspaceSections.map((section) => {
                    const Icon = section.icon;
                    const active = activeSection === section.id;
                    return <Link key={section.id} to={`/projects/${id}/${section.id}`} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-bold transition ${active ? "bg-[#eee9ff] text-[#5947a8]" : "text-[#6e6a7b] hover:bg-[#fff9e8]"}`}><Icon size={14} className="shrink-0" /><span className="truncate">{section.label}</span></Link>;
                  })}
                </nav>
              </div>

              <aside className="hidden lg:sticky lg:top-24 lg:block">
                <div className="rounded-[20px] border-2 border-[#191a32] bg-white p-2.5 shadow-[3px_4px_0_#c9bcff]">
                  <p className="px-2 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#858191]">Workspace</p>
                  <nav aria-label="Project workspace sections" className="space-y-0.5">
                    {workspaceSections.map((section) => {
                      const Icon = section.icon;
                      const active = activeSection === section.id;
                      return <Link key={section.id} to={`/projects/${id}/${section.id}`} aria-current={active ? "page" : undefined} className={`flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 transition ${active ? "bg-[#eee9ff] text-[#5947a8]" : "text-[#514e62] hover:bg-[#fff9e8]"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-white text-[#6f56d9]" : "bg-[#f7f4ee] text-[#777284]"}`}><Icon size={14} /></span><span className="min-w-0 truncate text-xs font-bold">{section.label}</span></Link>;
                    })}
                  </nav>
                </div>
              </aside>

              <div className="min-w-0">
            {activeSection === "details" && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#ffe35b] sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee9ff] text-[#6f56d9]"><Users size={19} /></span><div><p className="text-xl font-black">{members.length}/{project.teamSize}</p><p className="text-xs text-[#777284]">Team members</p></div></div><Link to={`/projects/${id}/team`} className="mt-4 inline-flex text-xs font-bold text-[#5947a8] hover:underline">View team <ArrowLeft size={13} className="ml-1 rotate-180" /></Link></article>
              <article className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#ffe35b] sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff3b7] text-[#715b00]"><FolderKanban size={19} /></span><div><p className="text-xl font-black">{tasks.filter((task) => task.status === "done").length}/{tasks.length}</p><p className="text-xs text-[#777284]">Tasks completed</p></div></div><Link to={`/projects/${id}/kanban`} className="mt-4 inline-flex text-xs font-bold text-[#5947a8] hover:underline">Open task board <ArrowLeft size={13} className="ml-1 rotate-180" /></Link></article>
              <article className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#ffe35b] sm:col-span-2 sm:p-5 xl:col-span-1"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f7ee] text-[#28734d]"><CalendarDays size={19} /></span><div><p className="text-sm font-extrabold">{timelineItems.find((item) => !item.complete)?.title || "All caught up"}</p><p className="text-xs text-[#777284]">{timelineItems.find((item) => !item.complete) ? `${timelineItems.find((item) => !item.complete).kind} · ${dateLabel(timelineItems.find((item) => !item.complete).date)}` : "No upcoming work"}</p></div></div><Link to={`/projects/${id}/timeline`} className="mt-4 inline-flex text-xs font-bold text-[#5947a8] hover:underline">View timeline <ArrowLeft size={13} className="ml-1 rotate-180" /></Link></article>
            </section>}

            {activeSection === "team" && <section className="grid gap-4">
              <article className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#c9bcff] sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Grow the team</p><h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold"><Users size={18} />Teammates</h2><p className="mt-1 text-xs text-[#6e6a7b]">Invite students you’re already connected with.</p></div><span className="rounded-full bg-[#eee9ff] px-2.5 py-1 text-xs font-bold text-[#5947a8]">{members.length}/{project.teamSize}</span></div>
                {canManageTeam ? project.status === "full" || members.length >= project.teamSize ? <p className="mt-4 rounded-xl bg-[#fff9e8] p-3 text-xs text-[#715b00]">Your team is full. Increase team size to invite someone.</p> : availableConnections.length ? <form onSubmit={inviteTeammate} className="mt-4 flex flex-col gap-2 sm:flex-row"><ConnectionPicker connections={availableConnections} value={inviteeId} onChange={setInviteeId} disabled={Boolean(busy)} /><button type="submit" disabled={!inviteeId || Boolean(busy)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2 text-xs font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50">{busy === "invite" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}Invite</button></form> : <p className="mt-4 rounded-xl bg-[#fffdf9] p-3 text-xs text-[#858191]">No connections available to invite yet.</p> : <p className="mt-4 rounded-xl bg-[#fffdf9] p-3 text-xs text-[#858191]">{project.myRole === "viewer" ? "Viewer access is read-only. Ask the owner or an admin if you need permission to make changes." : "Members can manage project work. Ask the owner or an admin to invite teammates."}</p>}
                <div className="mt-4 border-t border-[#e7dfd0] pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#858191]">Current team</p><div className="mt-2 space-y-2">{members.map((member) => { const isOwner = member.id === project.owner?.id; const role = isOwner ? "owner" : member.role || "member"; return <div key={member.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fffdf9] px-3 py-2"><Avatar person={member} size="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{member.name}</span>{project.isOwner && !isOwner ? <select aria-label={`Role for ${member.name}`} value={role} disabled={Boolean(busy)} onChange={(event) => changeMemberRole(member.id, event.target.value)} className="min-h-9 rounded-lg border border-[#e7dfd0] bg-white px-2 text-[10px] font-bold capitalize text-[#514e62] disabled:opacity-50"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select> : <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${role === "owner" ? "bg-[#fff3b7] text-[#715b00]" : role === "admin" ? "bg-[#eee9ff] text-[#5947a8]" : role === "viewer" ? "bg-[#f4f0e8] text-[#6e6a7b]" : "bg-[#e8f7ee] text-[#28734d]"}`}>{role}</span>}{project.isOwner && !isOwner && (confirmRemoveMemberId === member.id ? <span className="flex items-center gap-1.5"><span className="text-[10px] font-semibold text-[#a33b48]">Remove?</span><button type="button" disabled={Boolean(busy)} onClick={() => removeTeammate(member.id)} className="min-h-9 rounded-lg bg-[#fff1f1] px-2.5 text-[10px] font-bold text-[#a33b48] disabled:opacity-50">{busy === `remove-member-${member.id}` ? "Removing…" : "Confirm"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setConfirmRemoveMemberId("")} className="min-h-9 rounded-lg border border-[#e7dfd0] px-2.5 text-[10px] font-semibold">Cancel</button></span> : <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmRemoveMemberId(member.id)} className="min-h-9 rounded-lg border border-[#f0d4d4] px-2.5 text-[10px] font-semibold text-[#a33b48] hover:bg-[#fff1f1] disabled:opacity-50">Remove</button>)}</div>; })}</div>
                  <details className="mt-3 rounded-xl border border-[#e7dfd0] bg-[#fffdf9] p-3"><summary className="cursor-pointer text-xs font-bold text-[#514e62]">What can each role do?</summary><dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2"><div><dt className="font-bold text-[#715b00]">Owner</dt><dd className="mt-0.5 text-[#6e6a7b]">Full control, including team roles and member removal.</dd></div><div><dt className="font-bold text-[#5947a8]">Admin</dt><dd className="mt-0.5 text-[#6e6a7b]">Invite teammates and manage project work.</dd></div><div><dt className="font-bold text-[#28734d]">Member</dt><dd className="mt-0.5 text-[#6e6a7b]">Create and update tasks, milestones, and shared resources.</dd></div><div><dt className="font-bold text-[#6e6a7b]">Viewer</dt><dd className="mt-0.5 text-[#6e6a7b]">Read workspace details without changing them.</dd></div></dl></details>
                </div>
                {invitations.some((invitation) => invitation.status === "pending") && <div className="mt-4 border-t border-[#e7dfd0] pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#858191]">Pending invites</p><div className="mt-2 space-y-2">{invitations.filter((invitation) => invitation.status === "pending").map((invitation) => <div key={invitation.id} className="flex items-center gap-2 rounded-xl bg-[#fffdf9] px-3 py-2"><Avatar person={invitation.user} size="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{invitation.user?.name || "Student"}</span><span className="rounded-full bg-[#fff3b7] px-2 py-1 text-[10px] font-bold text-[#715b00]">Awaiting</span></div>)}</div></div>}
              </article>

            </section>}

            {activeSection === "resources" && <section className="grid gap-4">
              <article className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#c9bcff] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">One shared place</p><h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold"><FolderKanban size={18} />Project resources</h2><p className="mt-1 text-xs text-[#6e6a7b]">Share files, references, and useful links with the team.</p></div><span className="rounded-full bg-[#e8f7ee] px-2.5 py-1 text-xs font-bold text-[#28734d]">{resources.length} shared</span></div>
                {canManageWork && <form onSubmit={shareResource} className="mt-4 rounded-2xl border border-[#e7dfd0] bg-[#fffdf9] p-3">
                  <div role="group" aria-label="Resource type" className="mb-3 inline-flex rounded-xl border border-[#e7dfd0] bg-white p-1"><button type="button" aria-pressed={resourceMode === "link"} onClick={() => setResourceMode("link")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${resourceMode === "link" ? "bg-[#eee9ff] text-[#5947a8]" : "text-[#6e6a7b]"}`}><Link2 size={14} />Link</button><button type="button" aria-pressed={resourceMode === "file"} onClick={() => setResourceMode("file")} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${resourceMode === "file" ? "bg-[#eee9ff] text-[#5947a8]" : "text-[#6e6a7b]"}`}><Upload size={14} />File</button></div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end"><label className="text-[11px] font-semibold">Resource title<input value={resourceForm.title} onChange={(event) => setResourceForm((current) => ({ ...current, title: event.target.value }))} required={resourceMode === "link"} maxLength={100} placeholder={resourceMode === "file" ? "Optional label" : "e.g. Design reference"} className={`${inputClass} mt-1`} /></label>{resourceMode === "link" ? <label className="text-[11px] font-semibold">Link<input type="url" required value={resourceForm.url} onChange={(event) => setResourceForm((current) => ({ ...current, url: event.target.value }))} maxLength={2200} placeholder="https://…" className={`${inputClass} mt-1`} /></label> : <label className="text-[11px] font-semibold">Choose file<input type="file" accept="application/pdf,image/*,video/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" onChange={(event) => setResourceFile(event.target.files?.[0] || null)} className="mt-1 block min-h-11 w-full rounded-xl border-2 border-[#e7dfd0] bg-white px-2 py-2 text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-[#eee9ff] file:px-2 file:py-1 file:text-xs file:font-bold" /></label>}<button type="submit" disabled={Boolean(busy) || (resourceMode === "file" && !resourceFile)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3.5 py-2 text-xs font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50">{busy === "resource" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}{busy === "resource" ? resourceMode === "file" && uploadProgress ? `Uploading ${uploadProgress}%` : "Sharing…" : "Share"}</button></div>
                  <p className="mt-2 text-[10px] text-[#858191]">Files up to 50 MB. Shared files are available to project teammates.</p>
                </form>}
                {resources.length ? <ul className="mt-3 divide-y divide-[#f0eade]">{resources.map((resource) => <li key={resource.id} className="flex items-center gap-3 py-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eee9ff] text-[#6f56d9]">{resource.type === "file" ? <FileText size={18} /> : <Link2 size={18} />}</span><div className="min-w-0 flex-1"><a href={resource.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-bold text-[#17182d] hover:text-[#5947a8]">{resource.title}</a><p className="mt-0.5 truncate text-[10px] text-[#858191]">{resource.fileName || resource.url}{resource.size ? ` · ${(resource.size / (1024 * 1024)).toFixed(1)} MB` : ""}{resource.addedBy?.name ? ` · by ${resource.addedBy.name}` : ""}</p></div><a href={resource.url} target="_blank" rel="noreferrer" aria-label={`Open ${resource.title}`} className="rounded-lg border border-[#e7dfd0] p-2 text-[#6f56d9] hover:bg-[#fff9e8]"><ExternalLink size={15} /></a>{canManageWork && <button type="button" disabled={Boolean(busy)} onClick={() => removeResource(resource.id)} aria-label={`Remove ${resource.title}`} className="rounded-lg border border-[#f0d4d4] p-2 text-[#a33b48] hover:bg-[#fff1f1] disabled:opacity-50"><Trash2 size={15} /></button>}</li>)}</ul> : <div className="mt-3 rounded-xl border border-dashed border-[#e7dfd0] p-4 text-center text-xs text-[#858191]">No shared resources yet. Add the first link or file above.</div>}
              </article>
            </section>}

            {activeSection === "milestones" && <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Plan the work</p><h2 className="mt-1 text-xl font-extrabold">Milestones</h2><p className="mt-1 text-xs text-[#6e6a7b]">Break the project into goals your team can track.</p></div>{canManageWork && <button type="button" onClick={() => setShowMilestoneForm((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-white px-3.5 py-2 text-xs font-bold shadow-[0_2px_0_#c9bcff]">{showMilestoneForm ? <X size={15} /> : <Plus size={15} />}{showMilestoneForm ? "Close" : "Add milestone"}</button>}</div>
              {canManageWork && showMilestoneForm && <form onSubmit={submitMilestone} className="mb-4 grid gap-2 rounded-2xl border-2 border-[#191a32] bg-white p-3 shadow-[3px_4px_0_#c9bcff] sm:grid-cols-[1fr_190px_auto] sm:items-end"><label className="text-xs font-semibold">Milestone title<input required minLength={2} maxLength={100} value={milestoneForm.title} onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Prototype ready" className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-semibold">Target date<input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label><button type="submit" disabled={busy === "milestone"} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 text-xs font-bold disabled:opacity-50">{busy === "milestone" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}Save milestone</button></form>}
              {milestones.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{milestones.map((milestone) => {
                const linkedTasks = tasks.filter((task) => task.milestoneId === milestone.id);
                const done = linkedTasks.filter((task) => task.status === "done").length;
                const complete = milestone.status === "completed";
                const overdue = isOverdue(milestone.dueDate, milestone.status);
                const editing = editingMilestoneId === milestone.id;
                const confirmingDelete = confirmDeleteMilestoneId === milestone.id;
                return <article key={milestone.id} className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#ffe35b]">
                  {editing && canManageWork ? <form onSubmit={(event) => submitMilestoneEdit(event, milestone.id)} className="space-y-3">
                    <label className="block text-xs font-semibold">Milestone title<input required minLength={2} maxLength={100} value={editMilestoneForm.title} onChange={(event) => setEditMilestoneForm((current) => ({ ...current, title: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
                    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Target date<input type="date" value={editMilestoneForm.dueDate} onChange={(event) => setEditMilestoneForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-semibold">Status<select value={editMilestoneForm.status} onChange={(event) => setEditMilestoneForm((current) => ({ ...current, status: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></label></div>
                    <div className="flex justify-end gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => setEditingMilestoneId("")} className="rounded-lg border border-[#e7dfd0] px-3 py-2 text-xs font-semibold">Cancel</button><button type="submit" disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#191a32] bg-[#ffe35b] px-3 py-2 text-xs font-bold disabled:opacity-50">{busy === `edit-milestone-${milestone.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}Save</button></div>
                  </form> : <>
                    <div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${complete ? "bg-[#e8f7ee] text-[#28734d]" : overdue ? "bg-[#fff0ed] text-[#b64034]" : "bg-[#fff3b7] text-[#715b00]"}`}>{complete ? <CheckCircle2 size={18} /> : overdue ? <AlertTriangle size={18} /> : <Circle size={18} />}</span><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{milestone.title}</h3><p className={`mt-1 flex items-center gap-1 text-xs ${overdue ? "font-semibold text-[#b64034]" : "text-[#858191]"}`}><CalendarDays size={13} />{dateLabel(milestone.dueDate)}</p>{overdue && <span className="mt-1 inline-flex rounded-full bg-[#fff0ed] px-2 py-0.5 text-[10px] font-bold text-[#b64034]">Overdue</span>}</div>{canManageWork && <button type="button" disabled={Boolean(busy)} onClick={() => changeMilestoneStatus(milestone.id, complete ? "upcoming" : "completed")} className="min-h-9 rounded-lg px-2 py-2 text-[10px] font-bold text-[#5947a8] hover:bg-[#eee9ff] disabled:opacity-50">{busy === `milestone-${milestone.id}` ? "Saving…" : complete ? "Reopen" : "Complete"}</button>}</div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-[#858191]"><span>{linkedTasks.length} linked {linkedTasks.length === 1 ? "task" : "tasks"}</span><span>{done}/{linkedTasks.length} done</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f4f0e8]"><div className="h-full rounded-full bg-[#6f56d9]" style={{ width: `${linkedTasks.length ? done / linkedTasks.length * 100 : complete ? 100 : 0}%` }} /></div>
                    {canManageWork && <div className="mt-3 flex justify-end gap-1.5 border-t border-[#f0eade] pt-2.5">{confirmingDelete ? <><span className="mr-auto self-center text-[10px] font-semibold text-[#a33b48]">Delete milestone?</span><button type="button" disabled={Boolean(busy)} onClick={() => deleteMilestone(milestone.id)} className="min-h-9 rounded-md bg-[#a33b48] px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50">{busy === `delete-milestone-${milestone.id}` ? "Deleting…" : "Confirm"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDeleteMilestoneId("")} className="min-h-9 rounded-md border border-[#e7dfd0] px-2.5 py-2 text-[10px] font-semibold">Cancel</button></> : <><button type="button" disabled={Boolean(busy)} onClick={() => startEditMilestone(milestone)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#e7dfd0] px-2.5 py-2 text-[10px] font-semibold hover:bg-[#eee9ff] disabled:opacity-50"><Pencil size={12} />Edit</button><button type="button" disabled={Boolean(busy)} onClick={() => { setEditingMilestoneId(""); setConfirmDeleteMilestoneId(milestone.id); }} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#f0d4d4] px-2.5 py-2 text-[10px] font-semibold text-[#a33b48] hover:bg-[#fff1f1] disabled:opacity-50"><Trash2 size={12} />Delete</button></>}</div>}
                  </>}
                </article>;
              })}</div> : <div className="rounded-[20px] border-2 border-dashed border-[#cfc7b9] bg-white/70 px-4 py-6 text-center"><CalendarDays size={22} className="mx-auto text-[#6f56d9]" /><p className="mt-2 text-sm font-bold">No milestones yet</p><p className="mt-1 text-xs text-[#858191]">Add a goal or deadline to give the team a clear next step.</p></div>}
            </section>}

            {activeSection === "timeline" && <>
            <section aria-labelledby="project-timeline-heading" className="overflow-hidden rounded-[24px] border-2 border-[#191a32] bg-white shadow-[3px_4px_0_#87d4f4]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7dfd0] p-4 sm:p-5">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Project roadmap</p><h2 id="project-timeline-heading" className="mt-1 flex items-center gap-2 text-xl font-extrabold"><CalendarDays size={19} />Timeline</h2><p className="mt-1 text-xs text-[#6e6a7b]">Milestones and task deadlines, ordered by date.</p></div>
                <span className="rounded-full bg-[#eee9ff] px-3 py-1.5 text-xs font-bold text-[#5947a8]">{timelineItems.filter((item) => item.complete).length}/{timelineItems.length} complete</span>
              </div>
              {timelineItems.length ? <ol className="relative space-y-3 p-4 before:absolute before:bottom-8 before:left-[91px] before:top-8 before:w-px before:bg-[#d9cffb] sm:p-5 sm:before:left-[133px]">
                {timelineItems.map((item) => {
                  const overdue = item.status === "Overdue";
                  const statusTone = item.complete ? "bg-[#e8f7ee] text-[#28734d]" : overdue ? "bg-[#fff0ed] text-[#b64034]" : item.kind === "Milestone" ? "bg-[#fff3b7] text-[#715b00]" : "bg-[#eee9ff] text-[#5947a8]";
                  return <li key={item.id} className="relative grid grid-cols-[72px_minmax(0,1fr)] items-start gap-5 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-6">
                    <span className={`absolute left-[68px] top-4 z-10 h-3 w-3 rounded-full border-2 border-white ring-1 ${item.complete ? "bg-[#3b9b69] ring-[#3b9b69]" : overdue ? "bg-[#d34c42] ring-[#d34c42]" : "bg-[#6f56d9] ring-[#6f56d9]"} sm:left-[128px]`} />
                    <time className={`pt-3 text-right text-[10px] font-bold leading-4 sm:text-xs ${overdue ? "text-[#b64034]" : "text-[#6e6a7b]"}`}>{dateLabel(item.date)}</time>
                    <article className={`min-w-0 rounded-2xl border p-3.5 sm:p-4 ${overdue ? "border-[#f1c7c2] bg-[#fffafa]" : "border-[#e7dfd0] bg-[#fffdf9]"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-2.5"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${statusTone}`}>{item.kind === "Milestone" ? <CheckCircle2 size={16} /> : <FolderKanban size={15} />}</span><div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858191]">{item.kind}</p><h3 className="mt-0.5 break-words text-sm font-bold">{item.title}</h3><p className="mt-1 text-[10px] text-[#6e6a7b]">{item.detail}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone}`}>{item.status}</span></div>
                    </article>
                  </li>;
                })}
              </ol> : <div className="p-6 text-center"><CalendarDays size={24} className="mx-auto text-[#6f56d9]" /><h3 className="mt-2 text-sm font-bold">Your timeline is ready to plan</h3><p className="mt-1 text-xs text-[#858191]">Add milestones or tasks with due dates and they’ll appear here in order.</p></div>}
            </section>
            </>}

            {activeSection === "kanban" && <>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Team board</p><h2 className="mt-1 text-xl font-extrabold">Kanban board</h2><p className="mt-1 text-xs text-[#6e6a7b]">Drag cards between columns to update progress. On mobile, use the status menu.</p></div>{canManageWork && <button type="button" onClick={() => setShowTaskForm((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3.5 py-2 text-xs font-bold shadow-[0_2px_0_#191a32]">{showTaskForm ? <X size={15} /> : <Plus size={15} />}{showTaskForm ? "Close" : "Add task"}</button>}</div>
              {canManageWork && showTaskForm && <form onSubmit={submitTask} className="mb-5 rounded-[22px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#c9bcff] sm:p-5"><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold">Task title<input required minLength={2} maxLength={120} value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to get done?" className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-semibold">Due date<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label></div><label className="mt-3 block text-xs font-semibold">Details <span className="font-normal text-[#858191]">(optional)</span><textarea maxLength={600} rows={2} value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add a little context for your teammate…" className={`${inputClass} mt-1.5 resize-y`} /></label><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold">Assign to<select value={taskForm.assigneeId} onChange={(event) => setTaskForm((current) => ({ ...current, assigneeId: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.id === user?.id ? " (you)" : ""}</option>)}</select></label><label className="text-xs font-semibold">Milestone<select value={taskForm.milestoneId} onChange={(event) => setTaskForm((current) => ({ ...current, milestoneId: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="">No milestone</option>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label></div><div className="mt-4 flex justify-end"><button type="submit" disabled={busy === "task"} className="inline-flex items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2.5 text-sm font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50">{busy === "task" ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}Create task</button></div></form>}

              <div role="group" aria-label="Filter tasks by status" className="mb-4 grid grid-cols-3 gap-2 lg:hidden">{taskColumns.map((column) => {
                const count = tasks.filter((task) => task.status === column.id).length;
                const selected = activeTaskColumn === column.id;
                return <button key={column.id} type="button" aria-pressed={selected} onClick={() => setActiveTaskColumn(column.id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-2 text-xs font-bold transition ${selected ? "border-[#191a32] bg-[#eee9ff] text-[#5947a8] shadow-[0_2px_0_#191a32]" : "border-[#e7dfd0] bg-white text-[#6e6a7b]"}`}><span>{column.title}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${selected ? "bg-white" : "bg-[#f4f0e8]"}`}>{count}</span></button>;
              })}</div>

              <div className="grid items-start gap-4 lg:grid-cols-3">{taskColumns.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);
                const isDropTarget = dragOverColumn === column.id && draggedTaskId;
                return <section key={column.id} aria-label={`${column.title} tasks`} onDragOver={(event) => allowTaskDrop(event, column.id)} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOverColumn(""); }} onDrop={(event) => dropTask(event, column.id)} className={`${activeTaskColumn === column.id ? "block" : "hidden"} lg:block rounded-[22px] border-2 p-3 transition-colors sm:p-4 ${isDropTarget ? "border-[#6f56d9] bg-[#f4f0ff] shadow-[0_0_0_3px_#c9bcff]" : "border-[#191a32] bg-white/80 shadow-[3px_4px_0_#c9bcff]"}`}><div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${column.tone}`}><div><h3 className="flex items-center gap-2 text-sm font-extrabold"><span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.title}</h3><p className="mt-0.5 pl-4 text-[10px] text-[#6e6a7b]">{column.hint}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#514e62]">{columnTasks.length}</span></div>
                  <div className="mt-3 space-y-3">{columnTasks.map((task) => {
                    const milestone = milestones.find((item) => item.id === task.milestoneId);
                    const editing = editingTaskId === task.id;
                    const confirmingDelete = confirmDeleteId === task.id;
                    return <article key={task.id} draggable={canManageWork && !busy && !editing && !confirmingDelete} onDragStart={(event) => startTaskDrag(event, task)} onDragEnd={() => { setDraggedTaskId(""); setDragOverColumn(""); }} aria-roledescription="Kanban task card" className={`rounded-[18px] border border-[#e7dfd0] bg-white p-3.5 shadow-[0_2px_0_#f0eade] transition ${canManageWork && !editing && !confirmingDelete ? "cursor-grab active:cursor-grabbing" : ""} ${draggedTaskId === task.id ? "opacity-40" : "opacity-100"}`}>
                      {editing && canManageWork ? <form onSubmit={(event) => submitTaskEdit(event, task.id)} className="space-y-3">
                        <label className="block text-xs font-semibold">Task title<input required minLength={2} maxLength={120} value={editTaskForm.title} onChange={(event) => setEditTaskForm((current) => ({ ...current, title: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
                        <label className="block text-xs font-semibold">Details<textarea maxLength={600} rows={3} value={editTaskForm.description} onChange={(event) => setEditTaskForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} mt-1.5 resize-y`} /></label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs font-semibold">Status<select value={editTaskForm.status} onChange={(event) => setEditTaskForm((current) => ({ ...current, status: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="backlog">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
                          <label className="text-xs font-semibold">Due date<input type="date" value={editTaskForm.dueDate} onChange={(event) => setEditTaskForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
                          <label className="text-xs font-semibold">Assignee<select value={editTaskForm.assigneeId} onChange={(event) => setEditTaskForm((current) => ({ ...current, assigneeId: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.id === user?.id ? " (you)" : ""}</option>)}</select></label>
                          <label className="text-xs font-semibold">Milestone<select value={editTaskForm.milestoneId} onChange={(event) => setEditTaskForm((current) => ({ ...current, milestoneId: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="">No milestone</option>{milestones.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                        </div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingTaskId("")} disabled={Boolean(busy)} className="rounded-lg border border-[#e7dfd0] px-3 py-2 text-xs font-semibold">Cancel</button><button type="submit" disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#191a32] bg-[#ffe35b] px-3 py-2 text-xs font-bold disabled:opacity-50">{busy === `edit-task-${task.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}Save task</button></div>
                      </form> : <>
                        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="break-words text-sm font-bold">{task.title}</h4>{task.description && <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-[#6e6a7b]">{task.description}</p>}</div>{task.status === "done" && <CheckCircle2 size={17} className="shrink-0 text-[#28734d]" />}</div>
                        {milestone && <span className="mt-3 inline-flex max-w-full items-center gap-1 rounded-lg bg-[#eee9ff] px-2 py-1 text-[10px] font-semibold text-[#5947a8]"><FlagIcon />{milestone.title}</span>}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0eade] pt-3"><span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-[#6e6a7b]">{task.assignee ? <><Avatar person={task.assignee} size="h-7 w-7" /><span className="max-w-24 truncate">{task.assignee.name}</span></> : <><UserRound size={14} />Unassigned</>}<span className="mx-0.5">·</span><CalendarDays size={13} />{dateLabel(task.dueDate)}</span><TaskStatusPicker value={task.status} disabled={!canManageWork || Boolean(busy)} taskTitle={task.title} onChange={(status) => changeTaskStatus(task.id, status)} /></div>
                        {canManageWork && <div className="mt-2 flex items-center justify-between gap-2">{!task.assignee ? <button type="button" disabled={Boolean(busy)} onClick={() => perform(`assign-${task.id}`, () => api.updateProjectTask(id, task.id, { assigneeId: user?.id || "" }))} className="text-[10px] font-bold text-[#6f56d9] hover:underline disabled:opacity-50">Assign to me</button> : <span />}{confirmingDelete ? <div className="flex items-center gap-1.5"><span className="text-[10px] font-semibold text-[#a33b48]">Delete task?</span><button type="button" disabled={Boolean(busy)} onClick={() => deleteTask(task.id)} className="rounded-md bg-[#a33b48] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">{busy === `delete-task-${task.id}` ? "Deleting…" : "Confirm"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDeleteId("")} className="rounded-md border border-[#e7dfd0] px-2 py-1 text-[10px] font-semibold">Cancel</button></div> : <div className="flex gap-1"><button type="button" disabled={Boolean(busy)} onClick={() => startEditTask(task)} aria-label={`Edit ${task.title}`} className="inline-flex items-center gap-1 rounded-md border border-[#e7dfd0] px-2 py-1 text-[10px] font-semibold text-[#514e62] hover:bg-[#eee9ff] disabled:opacity-50"><Pencil size={12} />Edit</button><button type="button" disabled={Boolean(busy)} onClick={() => { setEditingTaskId(""); setConfirmDeleteId(task.id); }} aria-label={`Delete ${task.title}`} className="inline-flex items-center gap-1 rounded-md border border-[#f0d4d4] px-2 py-1 text-[10px] font-semibold text-[#a33b48] hover:bg-[#fff1f1] disabled:opacity-50"><Trash2 size={12} />Delete</button></div>}</div>}
                        <details className="mt-4 border-t border-[#f0eade] pt-3" onClick={(event) => event.stopPropagation()}>
                          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-xl px-1 text-xs font-bold text-[#514e62] transition hover:bg-[#faf8ff] marker:hidden [&::-webkit-details-marker]:hidden">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f2efff]"><MessageCircle size={14} className="text-[#6f56d9]" /></span>
                            <span>Team discussion</span>
                            <span className="rounded-full bg-[#eee9ff] px-2 py-0.5 text-[10px] font-bold text-[#5947a8]">{(task.comments || []).length}</span>
                          </summary>
                          <div className="space-y-3 pb-1 pt-1">
                            {(task.comments || []).length ? <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">{task.comments.map((comment) => {
                              const mayDelete = comment.author?.id === user?.id || ["owner", "admin"].includes(project?.myRole);
                              return <li key={comment.id} className="flex items-start gap-2.5 rounded-xl border border-[#f0eade] bg-[#fbf9f4] p-3">
                                <Avatar person={comment.author} size="h-7 w-7" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span className="text-[11px] font-bold text-[#17182d]">{comment.author?.name || "Teammate"}</span><time className="text-[10px] text-[#858191]">{activityTime(comment.createdAt)}</time></div>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#514e62]">{comment.text}</p>
                                </div>
                                {mayDelete && <button type="button" disabled={Boolean(busy)} onClick={() => removeTaskComment(task.id, comment.id)} aria-label="Delete comment" title="Delete comment" className="rounded-md p-1.5 text-[#858191] hover:bg-[#fff1f1] hover:text-[#a33b48] disabled:opacity-50">{busy === `delete-task-comment-${comment.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}</button>}
                              </li>;
                            })}</ul> : <p className="rounded-xl border border-dashed border-[#e7dfd0] bg-[#fffdf9] px-3 py-3 text-xs leading-5 text-[#858191]">No discussion yet. Share a question or update with your team.</p>}
                            {canManageWork ? <form onSubmit={(event) => submitTaskComment(event, task.id)} className="rounded-2xl border border-[#e7dfd0] bg-[#fffdf9] p-2.5 shadow-sm">
                              <label className="block"><span className="sr-only">Add to team discussion</span><textarea rows={2} maxLength={1000} value={taskCommentDrafts[task.id] || ""} onChange={(event) => setTaskCommentDrafts((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Write an update or ask a question…" className={`${inputClass} min-h-[72px] resize-none !border !bg-white !text-[13px] leading-5`} /></label>
                              <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-[#858191]">Keep your team in the loop</span><button type="submit" disabled={!String(taskCommentDrafts[task.id] || "").trim() || Boolean(busy)} aria-label="Post comment" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3 text-xs font-bold shadow-[0_2px_0_#191a32] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50">{busy === `task-comment-${task.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}Comment</button></div>
                            </form> : <p className="text-xs text-[#858191]">Viewer access is read-only.</p>}
                          </div>
                        </details>
                      </>}
                    </article>;
                  })}{columnTasks.length === 0 && <div className={`rounded-xl border border-dashed px-3 py-5 text-center text-xs ${isDropTarget ? "border-[#6f56d9] bg-white text-[#5947a8]" : "border-[#e7dfd0] text-[#858191]"}`}>{isDropTarget ? "Drop task here" : "No tasks here yet."}</div>}</div>
                </section>;
              })}</div>
            </section>
            </>}

            {activeSection === "activity" && <>
            <section className="overflow-hidden rounded-[24px] border-2 border-[#191a32] bg-white shadow-[3px_4px_0_#c9bcff]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7dfd0] p-4 sm:p-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Keep everyone in sync</p><h2 className="mt-1 text-xl font-extrabold">Team activity</h2></div><span className="rounded-full bg-[#eee9ff] px-3 py-1.5 text-xs font-bold text-[#5947a8]">{activity.length} updates</span></div>
              {activity.length ? <ol className="divide-y divide-[#f0eade]">{activity.slice(0, 25).map((item) => <li key={item.id} className="flex items-start gap-3 p-4 sm:p-5"><Avatar person={item.actor} size="h-10 w-10" /><div className="min-w-0 flex-1"><p className="break-words text-sm leading-6 text-[#514e62]"><span className="font-bold text-[#17182d]">{item.actor?.name || "A teammate"}</span>{" "}{activityActionLabels[item.action] || "updated"}{" "}{item.kind}{" “"}{item.title}{"”"}{item.summary ? <span className="text-[#6e6a7b]"> — {item.summary}</span> : null}</p><time className="mt-1 block text-xs text-[#858191]">{activityTime(item.createdAt)}</time></div></li>)}</ol> : <div className="px-5 py-10 text-center"><HistoryIcon /><h3 className="mt-3 text-sm font-bold">No team updates yet</h3><p className="mt-1 text-xs text-[#858191]">Task and milestone changes will appear here for the whole team.</p></div>}
            </section>
            </>}
              </div>
            </div>
          </>}
    </main>
  </div>;
}

function FlagIcon() { return <FolderKanban size={12} className="shrink-0" />; }
function HistoryIcon() { return <Clock3 size={22} className="mx-auto text-[#6f56d9]" />; }
