import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Circle, Clock3, FolderKanban, LoaderCircle, Pencil, Plus, Save, Trash2, UserRound, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { api } from "../utils/api";

const inputClass = "w-full rounded-xl border-2 border-[#e7dfd0] bg-[#fffdf9] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#858191] focus:border-[#7660dc]";
const taskColumns = [
  { id: "backlog", title: "To do", hint: "Ready to pick up", tone: "bg-[#f4f0e8]", dot: "bg-[#aaa5b3]" },
  { id: "in_progress", title: "In progress", hint: "Being worked on", tone: "bg-[#eee9ff]", dot: "bg-[#6f56d9]" },
  { id: "done", title: "Done", hint: "Completed tasks", tone: "bg-[#e8f7ee]", dot: "bg-[#3b9b69]" },
];
const activityActionLabels = { created: "added", updated: "updated", status_changed: "changed status for", assigned: "updated assignment for", deleted: "removed" };

function Avatar({ person, size = "h-9 w-9" }) {
  return <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] text-xs font-bold text-[#5947a8]`}>{person?.photo ? <img src={person.photo} alt="" className="h-full w-full object-cover" /> : person?.name?.slice(0, 1) || <UserRound size={15} />}</span>;
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

function activityTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loadedProjectId, setLoadedProjectId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeTaskColumn, setActiveTaskColumn] = useState("backlog");
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState("");
  const [confirmDeleteMilestoneId, setConfirmDeleteMilestoneId] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigneeId: "", milestoneId: "", dueDate: "" });
  const [editTaskForm, setEditTaskForm] = useState({ title: "", description: "", status: "backlog", assigneeId: "", milestoneId: "", dueDate: "" });
  const [milestoneForm, setMilestoneForm] = useState({ title: "", dueDate: "" });
  const [editMilestoneForm, setEditMilestoneForm] = useState({ title: "", dueDate: "", status: "upcoming" });
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    api.projectWorkspace(id)
      .then((data) => { if (active) { setWorkspace(data); setActiveTaskColumn(taskColumns.find((column) => data.tasks?.some((task) => task.status === column.id))?.id || "backlog"); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadedProjectId(id); });
    return () => { active = false; };
  }, [id]);

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
    const saved = await perform(`status-task-${taskId}`, () => api.updateProjectTask(id, taskId, { status }));
    if (saved) setActiveTaskColumn(status);
  }

  async function deleteTask(taskId) {
    const deleted = await perform(`delete-task-${taskId}`, () => api.deleteProjectTask(id, taskId));
    if (deleted) setConfirmDeleteId("");
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

  const project = workspace?.project;
  const members = useMemo(() => {
    if (!project) return [];
    const people = [project.owner, ...(project.members || [])];
    return people.filter((person, index) => person?.id && people.findIndex((candidate) => candidate?.id === person.id) === index);
  }, [project]);
  const tasks = workspace?.tasks || [];
  const milestones = workspace?.milestones || [];
  const activity = workspace?.activity || [];
  const completedMilestones = milestones.filter((milestone) => milestone.status === "completed").length;

  return <div className="min-h-screen orbit-pattern-bg text-[#17182d]"><Navbar />
    <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8">
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-[#a33b48]">{error}</p>}
      {loading ? <div role="status" className="rounded-[24px] border-2 border-[#191a32] bg-white p-12 text-center text-sm text-[#6e6a7b] shadow-[4px_5px_0_#c9bcff]"><LoaderCircle size={24} className="mx-auto animate-spin text-[#6f56d9]" /><span className="mt-2 block">Loading project workspace…</span></div>
        : !project ? <section className="mx-auto max-w-xl rounded-[24px] border-2 border-[#191a32] bg-white p-8 text-center shadow-[4px_5px_0_#c9bcff]"><FolderKanban size={30} className="mx-auto text-[#6f56d9]" /><h1 className="mt-3 text-xl font-extrabold">Workspace unavailable</h1><p className="mt-2 text-sm text-[#6e6a7b]">Only this project’s owner and accepted teammates can open its workspace.</p><Link to="/projects" className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2.5 text-sm font-bold shadow-[0_2px_0_#191a32]"><ArrowLeft size={15} />Back to projects</Link></section>
          : <>
            <Link to="/projects" className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#514e62] hover:bg-white/70 hover:text-[#5947a8]"><ArrowLeft size={16} />Projects</Link>
            <header className="relative overflow-hidden rounded-[26px] border-2 border-[#191a32] bg-gradient-to-br from-[#eee9ff] via-white to-[#fff8d9] p-5 shadow-[4px_5px_0_#c9bcff] sm:p-7">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-[#c9bcff]/70" />
              <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0"><span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9cffb] bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]"><FolderKanban size={12} />Project workspace</span><h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{project.title}</h1><p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[#514e62]">{project.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{(project.skills || []).map((skill) => <span key={skill} className="rounded-lg border border-[#d9cffb] bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-[#5947a8]">{skill}</span>)}</div>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#e7dfd0] bg-white/90 px-3.5 py-3"><p className="text-xl font-black">{workspace.progress}%</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#858191]">Progress</p></div>
                  <div className="rounded-2xl border border-[#e7dfd0] bg-white/90 px-3.5 py-3"><p className="text-xl font-black">{completedMilestones}/{milestones.length}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#858191]">Milestones</p></div>
                  <div className="col-span-2 rounded-2xl border border-[#e7dfd0] bg-white/90 px-3.5 py-3 sm:col-span-1"><p className="text-xl font-black">{members.length}/{project.teamSize}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#858191]">Team</p></div>
                </div>
              </div>
              <div className="relative z-10 mt-5 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-[#6f56d9] transition-all" style={{ width: `${workspace.progress}%` }} /></div>
              <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d9cffb] pt-4">
                <div className="flex items-center gap-2"><div className="flex -space-x-2">{members.slice(0, 5).map((member) => <span key={member.id} title={member.name} className="rounded-full ring-2 ring-white"><Avatar person={member} size="h-8 w-8" /></span>)}</div><span className="text-xs text-[#6e6a7b]">{members.length} {members.length === 1 ? "teammate" : "teammates"}</span></div>
                <div className="flex flex-wrap gap-2">{project.roles?.slice(0, 3).map((role) => <span key={role} className="rounded-full bg-[#fff3b7] px-2.5 py-1 text-[10px] font-bold text-[#715b00]">{role}</span>)}</div>
              </div>
            </header>

            <section className="mt-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Plan the work</p><h2 className="mt-1 text-xl font-extrabold">Milestones</h2><p className="mt-1 text-xs text-[#6e6a7b]">Break the project into goals your team can track.</p></div><button type="button" onClick={() => setShowMilestoneForm((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-white px-3.5 py-2 text-xs font-bold shadow-[0_2px_0_#c9bcff]">{showMilestoneForm ? <X size={15} /> : <Plus size={15} />}{showMilestoneForm ? "Close" : "Add milestone"}</button></div>
              {showMilestoneForm && <form onSubmit={submitMilestone} className="mb-4 grid gap-2 rounded-2xl border-2 border-[#191a32] bg-white p-3 shadow-[3px_4px_0_#c9bcff] sm:grid-cols-[1fr_190px_auto] sm:items-end"><label className="text-xs font-semibold">Milestone title<input required minLength={2} maxLength={100} value={milestoneForm.title} onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Prototype ready" className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-semibold">Target date<input type="date" value={milestoneForm.dueDate} onChange={(event) => setMilestoneForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label><button type="submit" disabled={busy === "milestone"} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 text-xs font-bold disabled:opacity-50">{busy === "milestone" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}Save milestone</button></form>}
              {milestones.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{milestones.map((milestone) => {
                const linkedTasks = tasks.filter((task) => task.milestoneId === milestone.id);
                const done = linkedTasks.filter((task) => task.status === "done").length;
                const complete = milestone.status === "completed";
                const overdue = isOverdue(milestone.dueDate, milestone.status);
                const editing = editingMilestoneId === milestone.id;
                const confirmingDelete = confirmDeleteMilestoneId === milestone.id;
                return <article key={milestone.id} className="rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#ffe35b]">
                  {editing ? <form onSubmit={(event) => submitMilestoneEdit(event, milestone.id)} className="space-y-3">
                    <label className="block text-xs font-semibold">Milestone title<input required minLength={2} maxLength={100} value={editMilestoneForm.title} onChange={(event) => setEditMilestoneForm((current) => ({ ...current, title: event.target.value }))} className={`${inputClass} mt-1.5`} /></label>
                    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Target date<input type="date" value={editMilestoneForm.dueDate} onChange={(event) => setEditMilestoneForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-semibold">Status<select value={editMilestoneForm.status} onChange={(event) => setEditMilestoneForm((current) => ({ ...current, status: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></label></div>
                    <div className="flex justify-end gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => setEditingMilestoneId("")} className="rounded-lg border border-[#e7dfd0] px-3 py-2 text-xs font-semibold">Cancel</button><button type="submit" disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#191a32] bg-[#ffe35b] px-3 py-2 text-xs font-bold disabled:opacity-50">{busy === `edit-milestone-${milestone.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}Save</button></div>
                  </form> : <>
                    <div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${complete ? "bg-[#e8f7ee] text-[#28734d]" : overdue ? "bg-[#fff0ed] text-[#b64034]" : "bg-[#fff3b7] text-[#715b00]"}`}>{complete ? <CheckCircle2 size={18} /> : overdue ? <AlertTriangle size={18} /> : <Circle size={18} />}</span><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{milestone.title}</h3><p className={`mt-1 flex items-center gap-1 text-xs ${overdue ? "font-semibold text-[#b64034]" : "text-[#858191]"}`}><CalendarDays size={13} />{dateLabel(milestone.dueDate)}</p>{overdue && <span className="mt-1 inline-flex rounded-full bg-[#fff0ed] px-2 py-0.5 text-[10px] font-bold text-[#b64034]">Overdue</span>}</div><button type="button" disabled={Boolean(busy)} onClick={() => changeMilestoneStatus(milestone.id, complete ? "upcoming" : "completed")} className="min-h-9 rounded-lg px-2 py-2 text-[10px] font-bold text-[#5947a8] hover:bg-[#eee9ff] disabled:opacity-50">{busy === `milestone-${milestone.id}` ? "Saving…" : complete ? "Reopen" : "Complete"}</button></div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-[#858191]"><span>{linkedTasks.length} linked {linkedTasks.length === 1 ? "task" : "tasks"}</span><span>{done}/{linkedTasks.length} done</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f4f0e8]"><div className="h-full rounded-full bg-[#6f56d9]" style={{ width: `${linkedTasks.length ? done / linkedTasks.length * 100 : complete ? 100 : 0}%` }} /></div>
                    <div className="mt-3 flex justify-end gap-1.5 border-t border-[#f0eade] pt-2.5">{confirmingDelete ? <><span className="mr-auto self-center text-[10px] font-semibold text-[#a33b48]">Delete milestone?</span><button type="button" disabled={Boolean(busy)} onClick={() => deleteMilestone(milestone.id)} className="min-h-9 rounded-md bg-[#a33b48] px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50">{busy === `delete-milestone-${milestone.id}` ? "Deleting…" : "Confirm"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDeleteMilestoneId("")} className="min-h-9 rounded-md border border-[#e7dfd0] px-2.5 py-2 text-[10px] font-semibold">Cancel</button></> : <><button type="button" disabled={Boolean(busy)} onClick={() => startEditMilestone(milestone)} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#e7dfd0] px-2.5 py-2 text-[10px] font-semibold hover:bg-[#eee9ff] disabled:opacity-50"><Pencil size={12} />Edit</button><button type="button" disabled={Boolean(busy)} onClick={() => { setEditingMilestoneId(""); setConfirmDeleteMilestoneId(milestone.id); }} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[#f0d4d4] px-2.5 py-2 text-[10px] font-semibold text-[#a33b48] hover:bg-[#fff1f1] disabled:opacity-50"><Trash2 size={12} />Delete</button></>}</div>
                  </>}
                </article>;
              })}</div> : <div className="rounded-[20px] border-2 border-dashed border-[#cfc7b9] bg-white/70 px-4 py-6 text-center"><CalendarDays size={22} className="mx-auto text-[#6f56d9]" /><p className="mt-2 text-sm font-bold">No milestones yet</p><p className="mt-1 text-xs text-[#858191]">Add a goal or deadline to give the team a clear next step.</p></div>}
            </section>

            <section className="mt-9">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Team board</p><h2 className="mt-1 text-xl font-extrabold">Tasks</h2><p className="mt-1 text-xs text-[#6e6a7b]">Assign work, track progress, and move tasks as you go.</p></div><button type="button" onClick={() => setShowTaskForm((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3.5 py-2 text-xs font-bold shadow-[0_2px_0_#191a32]">{showTaskForm ? <X size={15} /> : <Plus size={15} />}{showTaskForm ? "Close" : "Add task"}</button></div>
              {showTaskForm && <form onSubmit={submitTask} className="mb-5 rounded-[22px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#c9bcff] sm:p-5"><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold">Task title<input required minLength={2} maxLength={120} value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to get done?" className={`${inputClass} mt-1.5`} /></label><label className="text-xs font-semibold">Due date<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} className={`${inputClass} mt-1.5`} /></label></div><label className="mt-3 block text-xs font-semibold">Details <span className="font-normal text-[#858191]">(optional)</span><textarea maxLength={600} rows={2} value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add a little context for your teammate…" className={`${inputClass} mt-1.5 resize-y`} /></label><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold">Assign to<select value={taskForm.assigneeId} onChange={(event) => setTaskForm((current) => ({ ...current, assigneeId: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.id === user?.id ? " (you)" : ""}</option>)}</select></label><label className="text-xs font-semibold">Milestone<select value={taskForm.milestoneId} onChange={(event) => setTaskForm((current) => ({ ...current, milestoneId: event.target.value }))} className={`${inputClass} mt-1.5`}><option value="">No milestone</option>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label></div><div className="mt-4 flex justify-end"><button type="submit" disabled={busy === "task"} className="inline-flex items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2.5 text-sm font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50">{busy === "task" ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}Create task</button></div></form>}

              <div role="group" aria-label="Filter tasks by status" className="mb-4 grid grid-cols-3 gap-2 lg:hidden">{taskColumns.map((column) => {
                const count = tasks.filter((task) => task.status === column.id).length;
                const selected = activeTaskColumn === column.id;
                return <button key={column.id} type="button" aria-pressed={selected} onClick={() => setActiveTaskColumn(column.id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-2 text-xs font-bold transition ${selected ? "border-[#191a32] bg-[#eee9ff] text-[#5947a8] shadow-[0_2px_0_#191a32]" : "border-[#e7dfd0] bg-white text-[#6e6a7b]"}`}><span>{column.title}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${selected ? "bg-white" : "bg-[#f4f0e8]"}`}>{count}</span></button>;
              })}</div>

              <div className="grid items-start gap-4 lg:grid-cols-3">{taskColumns.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);
                return <section key={column.id} aria-label={`${column.title} tasks`} className={`${activeTaskColumn === column.id ? "block" : "hidden"} lg:block rounded-[22px] border-2 border-[#191a32] bg-white/80 p-3 shadow-[3px_4px_0_#c9bcff] sm:p-4`}><div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${column.tone}`}><div><h3 className="flex items-center gap-2 text-sm font-extrabold"><span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.title}</h3><p className="mt-0.5 pl-4 text-[10px] text-[#6e6a7b]">{column.hint}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#514e62]">{columnTasks.length}</span></div>
                  <div className="mt-3 space-y-3">{columnTasks.map((task) => {
                    const milestone = milestones.find((item) => item.id === task.milestoneId);
                    const editing = editingTaskId === task.id;
                    const confirmingDelete = confirmDeleteId === task.id;
                    return <article key={task.id} className="rounded-[18px] border border-[#e7dfd0] bg-white p-3.5 shadow-[0_2px_0_#f0eade]">
                      {editing ? <form onSubmit={(event) => submitTaskEdit(event, task.id)} className="space-y-3">
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
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0eade] pt-2.5"><span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-[#6e6a7b]">{task.assignee ? <><Avatar person={task.assignee} size="h-6 w-6" /><span className="max-w-24 truncate">{task.assignee.name}</span></> : <><UserRound size={13} />Unassigned</>}<span className="mx-0.5">·</span><CalendarDays size={12} />{dateLabel(task.dueDate)}</span><label className="sr-only" htmlFor={`task-status-${task.id}`}>Move {task.title} to status</label><select id={`task-status-${task.id}`} value={task.status} disabled={Boolean(busy)} onChange={(event) => changeTaskStatus(task.id, event.target.value)} className="min-h-10 max-w-full rounded-lg border border-[#191a32] bg-[#fff9e8] px-2 py-2 text-[10px] font-bold text-[#514e62] disabled:opacity-50"><option value="backlog">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>
                        <div className="mt-2 flex items-center justify-between gap-2">{!task.assignee ? <button type="button" disabled={Boolean(busy)} onClick={() => perform(`assign-${task.id}`, () => api.updateProjectTask(id, task.id, { assigneeId: user?.id || "" }))} className="text-[10px] font-bold text-[#6f56d9] hover:underline disabled:opacity-50">Assign to me</button> : <span />}{confirmingDelete ? <div className="flex items-center gap-1.5"><span className="text-[10px] font-semibold text-[#a33b48]">Delete task?</span><button type="button" disabled={Boolean(busy)} onClick={() => deleteTask(task.id)} className="rounded-md bg-[#a33b48] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50">{busy === `delete-task-${task.id}` ? "Deleting…" : "Confirm"}</button><button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDeleteId("")} className="rounded-md border border-[#e7dfd0] px-2 py-1 text-[10px] font-semibold">Cancel</button></div> : <div className="flex gap-1"><button type="button" disabled={Boolean(busy)} onClick={() => startEditTask(task)} aria-label={`Edit ${task.title}`} className="inline-flex items-center gap-1 rounded-md border border-[#e7dfd0] px-2 py-1 text-[10px] font-semibold text-[#514e62] hover:bg-[#eee9ff] disabled:opacity-50"><Pencil size={12} />Edit</button><button type="button" disabled={Boolean(busy)} onClick={() => { setEditingTaskId(""); setConfirmDeleteId(task.id); }} aria-label={`Delete ${task.title}`} className="inline-flex items-center gap-1 rounded-md border border-[#f0d4d4] px-2 py-1 text-[10px] font-semibold text-[#a33b48] hover:bg-[#fff1f1] disabled:opacity-50"><Trash2 size={12} />Delete</button></div>}</div>
                      </>}
                    </article>;
                  })}{columnTasks.length === 0 && <div className="rounded-xl border border-dashed border-[#e7dfd0] px-3 py-5 text-center text-xs text-[#858191]">No tasks here yet.</div>}</div>
                </section>;
              })}</div>
            </section>

            <section className="mt-9 overflow-hidden rounded-[24px] border-2 border-[#191a32] bg-white shadow-[3px_4px_0_#c9bcff]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e7dfd0] p-4 sm:p-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Keep everyone in sync</p><h2 className="mt-1 text-xl font-extrabold">Team activity</h2></div><span className="rounded-full bg-[#eee9ff] px-3 py-1.5 text-xs font-bold text-[#5947a8]">{activity.length} updates</span></div>
              {activity.length ? <ol className="divide-y divide-[#f0eade]">{activity.slice(0, 25).map((item) => <li key={item.id} className="flex items-start gap-3 p-4 sm:p-5"><Avatar person={item.actor} size="h-10 w-10" /><div className="min-w-0 flex-1"><p className="break-words text-sm leading-6 text-[#514e62]"><span className="font-bold text-[#17182d]">{item.actor?.name || "A teammate"}</span>{" "}{activityActionLabels[item.action] || "updated"}{" "}{item.kind}{" “"}{item.title}{"”"}{item.summary ? <span className="text-[#6e6a7b]"> — {item.summary}</span> : null}</p><time className="mt-1 block text-xs text-[#858191]">{activityTime(item.createdAt)}</time></div></li>)}</ol> : <div className="px-5 py-10 text-center"><HistoryIcon /><h3 className="mt-3 text-sm font-bold">No team updates yet</h3><p className="mt-1 text-xs text-[#858191]">Task and milestone changes will appear here for the whole team.</p></div>}
            </section>
          </>}
    </main>
  </div>;
}

function FlagIcon() { return <FolderKanban size={12} className="shrink-0" />; }
function HistoryIcon() { return <Clock3 size={22} className="mx-auto text-[#6f56d9]" />; }
