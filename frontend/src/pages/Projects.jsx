import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, Clock3, FolderKanban, LoaderCircle, Pencil, Plus, RotateCcw, Search, Send, Trash2, Users, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { useConnectlyStore } from "../store/useConnectlyStore";
import { api } from "../utils/api";

const fieldClass = "w-full rounded-xl border-2 border-[#e7dfd0] bg-[#fffdf9] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#858191] focus:border-[#7660dc]";

function ProfileAvatar({ person, size = "h-10 w-10" }) {
  return <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] text-sm font-bold text-[#5947a8]`}>{person?.photo ? <img src={person.photo} alt="" className="h-full w-full object-cover" /> : person?.name?.slice(0, 1) || "S"}</span>;
}

function ProjectCard({ project, user, onRequested, busyKey }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState("");
  const sharedSkills = useMemo(() => {
    const mine = new Set((user?.skills || []).map((skill) => skill.toLowerCase()));
    return (project.skills || []).filter((skill) => mine.has(skill.toLowerCase()));
  }, [project.skills, user?.skills]);
  const requestPending = project.myRequestStatus === "pending";
  const alreadyJoined = project.myRequestStatus === "accepted" || project.members?.some((member) => member.id === user?.id);

  async function submitRequest(event) {
    event.preventDefault();
    const sent = await onRequested(project.id, message);
    if (sent) { setRequestOpen(false); setMessage(""); }
  }

  return <article className="rounded-[24px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#c9bcff] sm:p-5">
    <div className="flex items-start gap-3">
      <Link to={`/profile/${project.owner.id}`} aria-label={`Open ${project.owner.name}'s profile`}><ProfileAvatar person={project.owner} size="h-12 w-12" /></Link>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-extrabold leading-tight">{project.title}</h2>
        <p className="mt-1 text-xs text-[#6e6a7b]"><Link to={`/profile/${project.owner.id}`} className="font-semibold hover:text-[#5947a8]">{project.owner.name}</Link>{project.owner.university ? ` · ${project.owner.university}` : ""}</p>
      </div>
      <span className="rounded-full bg-[#e8f7ee] px-2.5 py-1 text-[10px] font-bold text-[#28734d]">{project.status === "open" ? "Recruiting" : project.status}</span>
    </div>
    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[#514e62]">{project.description}</p>
    {project.roles?.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#858191]">Looking for</p><div className="mt-2 flex flex-wrap gap-2">{project.roles.map((role) => <span key={role} className="rounded-lg border border-[#e7dfd0] bg-[#fff9e8] px-2.5 py-1.5 text-xs font-semibold text-[#514e62]">{role}</span>)}</div></div>}
    {project.skills?.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#858191]">Skills needed</p><div className="mt-2 flex flex-wrap gap-2">{project.skills.map((skill) => <span key={skill} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${sharedSkills.includes(skill) ? "bg-[#eee9ff] text-[#5947a8] ring-1 ring-[#c9bcff]" : "bg-[#f4f0e8] text-[#514e62]"}`}>{skill}{sharedSkills.includes(skill) ? " · Match" : ""}</span>)}</div></div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7dfd0] pt-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-[#6e6a7b]"><Users size={15} />{project.memberCount}/{project.teamSize} teammates</span>
      {project.isOwner ? <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#eee9ff] px-3 py-2 text-xs font-bold text-[#5947a8] shadow-[0_2px_0_#191a32]">Your workspace<ArrowRight size={14} /></Link>
        : alreadyJoined ? <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#191a32] bg-[#e8f7ee] px-3 py-2 text-xs font-bold text-[#28734d] shadow-[0_2px_0_#191a32]"><Check size={14} />Open workspace<ArrowRight size={14} /></Link>
          : requestPending ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff3b7] px-3 py-2 text-xs font-bold text-[#715b00]"><Clock3 size={14} />Request pending</span>
            : <button type="button" onClick={() => setRequestOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3.5 py-2 text-xs font-bold text-[#17182d] shadow-[0_2px_0_#191a32] hover:-translate-y-0.5">{project.myRequestStatus === "rejected" ? "Try again" : "Request to join"}<ArrowRight size={14} /></button>}
    </div>
    {requestOpen && <form onSubmit={submitRequest} className="mt-4 rounded-2xl border border-[#e7dfd0] bg-[#fffdf9] p-3">
      <label htmlFor={`join-message-${project.id}`} className="text-xs font-bold">Tell the team why you’re interested <span className="font-normal text-[#858191]">(optional)</span></label>
      <textarea id={`join-message-${project.id}`} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={3} placeholder="Share what you can contribute…" className={`${fieldClass} mt-2 resize-y`} />
      <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setRequestOpen(false)} className="rounded-lg border border-[#e7dfd0] px-3 py-2 text-xs font-semibold text-[#514e62] hover:bg-white">Cancel</button><button type="submit" disabled={busyKey === `join-${project.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffe35b] px-3 py-2 text-xs font-bold text-[#17182d] disabled:opacity-50">{busyKey === `join-${project.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}{busyKey === `join-${project.id}` ? "Sending…" : "Send request"}</button></div>
    </form>}
  </article>;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectForm, setEditProjectForm] = useState({ title: "", description: "", skills: "", roles: "", teamSize: "4" });
  const [confirmProjectAction, setConfirmProjectAction] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ title: "", description: "", skills: "", roles: "", teamSize: "4" });
  const actionLocks = useRef(new Set());

  const loadProjects = useCallback(async (query = search) => {
    const [openProjects, ownedProjects, joined] = await Promise.all([api.collaborationProjects(query), api.myCollaborationProjects(), api.joinedCollaborationProjects()]);
    setProjects(openProjects);
    setMyProjects(ownedProjects);
    setJoinedProjects(joined);
  }, [search]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all([api.collaborationProjects(search), api.myCollaborationProjects(), api.joinedCollaborationProjects()])
        .then(([openProjects, ownedProjects, joined]) => { if (active) { setProjects(openProjects); setMyProjects(ownedProjects); setJoinedProjects(joined); setError(""); } })
        .catch((requestError) => { if (active) setError(requestError.message); })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  async function createProject(event) {
    event.preventDefault();
    if (actionLocks.current.has("create")) return;
    actionLocks.current.add("create");
    setSaving(true); setError(""); setSuccess("");
    const splitList = (value) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
    try {
      await api.createCollaborationProject({ title: form.title.trim(), description: form.description.trim(), skills: splitList(form.skills), roles: splitList(form.roles), teamSize: Number(form.teamSize) });
      setForm({ title: "", description: "", skills: "", roles: "", teamSize: "4" });
      setShowCreateForm(false); setSuccess("Project posted. Students can now request to join your team.");
      await loadProjects(""); setSearch("");
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
    finally { actionLocks.current.delete("create"); setSaving(false); }
  }

  async function requestToJoin(projectId, message) {
    const lock = `join-${projectId}`;
    if (actionLocks.current.has(lock)) return false;
    actionLocks.current.add(lock);
    setBusyKey(lock); setError(""); setSuccess("");
    try { await api.requestToJoinProject(projectId, message); await loadProjects(); setSuccess("Join request sent to the project owner."); return true; }
    catch (requestError) { setError(requestError.message); return false; }
    finally { actionLocks.current.delete(lock); setBusyKey(""); }
  }

  async function decideRequest(projectId, requestId, action) {
    const key = `decision-${requestId}`;
    if (actionLocks.current.has(key)) return;
    actionLocks.current.add(key);
    setBusyKey(key); setError(""); setSuccess("");
    try { await api.decideProjectRequest(projectId, requestId, action); window.dispatchEvent(new Event("connectly:backend-update")); await loadProjects(); setSuccess(action === "accept" ? "Student added to your project team." : "Request declined."); }
    catch (requestError) { setError(requestError.message); }
    finally { actionLocks.current.delete(key); setBusyKey(""); }
  }

  function startProjectEdit(project) {
    setEditProjectForm({ title: project.title, description: project.description, skills: project.skills.join(", "), roles: project.roles.join(", "), teamSize: String(project.teamSize) });
    setEditingProject(project);
    setError("");
    setSuccess("");
  }

  async function saveProjectEdit(event) {
    event.preventDefault();
    if (!editingProject || actionLocks.current.has(`edit-project-${editingProject.id}`)) return;
    const lock = `edit-project-${editingProject.id}`;
    actionLocks.current.add(lock);
    setBusyKey(lock); setError(""); setSuccess("");
    const splitList = (value) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
    try {
      await api.updateCollaborationProject(editingProject.id, { title: editProjectForm.title.trim(), description: editProjectForm.description.trim(), skills: splitList(editProjectForm.skills), roles: splitList(editProjectForm.roles), teamSize: Number(editProjectForm.teamSize) });
      setEditingProject(null);
      await loadProjects();
      setSuccess("Project details updated.");
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
    finally { actionLocks.current.delete(lock); setBusyKey(""); }
  }

  async function confirmProjectChange() {
    if (!confirmProjectAction) return;
    const { project, action } = confirmProjectAction;
    const lock = `${action}-project-${project.id}`;
    if (actionLocks.current.has(lock)) return;
    actionLocks.current.add(lock);
    setBusyKey(lock); setError(""); setSuccess("");
    try {
      if (action === "delete") {
        await api.deleteCollaborationProject(project.id);
        await useConnectlyStore.getState().loadNotifications(true).catch(() => {});
        setSuccess(`“${project.title}” and its workspace were deleted.`);
      } else {
        await api.updateCollaborationProject(project.id, { status: action === "complete" ? "completed" : "open" });
        setSuccess(action === "complete" ? `“${project.title}” marked complete. Its workspace is still available to the team.` : `“${project.title}” reopened for new teammates.`);
      }
      setConfirmProjectAction(null);
      await loadProjects();
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
    finally { actionLocks.current.delete(lock); setBusyKey(""); }
  }

  const discoverProjects = projects.filter((project) => !project.isOwner);
  const pendingRequestCount = myProjects.reduce((total, project) => total + project.requests.filter((request) => request.status === "pending").length, 0);

  return <div className="min-h-screen orbit-pattern-bg text-[#17182d]"><Navbar />
    <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8">
      <header className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-[26px] border-2 border-[#191a32] bg-gradient-to-br from-[#eee9ff] via-white to-[#fff8d9] p-5 shadow-[4px_5px_0_#c9bcff] sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="relative z-10"><span className="inline-flex items-center rounded-full border border-[#d9cffb] bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Build together</span><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Find your project team</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6e6a7b]">Find projects that fit your skills—or bring your own idea and meet your next teammates.</p></div>
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowCreateForm((open) => !open)} className="inline-flex w-fit items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2.5 text-sm font-bold text-[#17182d] shadow-[0_3px_0_#191a32] transition hover:-translate-y-0.5">{showCreateForm ? <X size={17} /> : <Plus size={17} />}{showCreateForm ? "Close form" : "Post a project"}</button>
        </div>
      </header>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-[#a33b48]">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-[#28734d]">{success}</p>}

      {showCreateForm && <form onSubmit={createProject} className="mb-7 rounded-[24px] border-2 border-[#191a32] bg-white p-4 shadow-[4px_5px_0_#ffe35b] sm:p-5">
        <h2 className="text-lg font-extrabold">Tell students what you’re building</h2><p className="mt-1 text-xs text-[#6e6a7b]">Add the skills and roles your team needs. Separate each item with a comma.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Project name<input required minLength={3} maxLength={100} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Campus marketplace app" className={`${fieldClass} mt-1.5`} /></label><label className="text-xs font-semibold">Team size (including you)<input required type="number" min={2} max={12} value={form.teamSize} onChange={(event) => setForm((current) => ({ ...current, teamSize: event.target.value }))} className={`${fieldClass} mt-1.5`} /></label></div>
        <label className="mt-3 block text-xs font-semibold">What are you building?<textarea required minLength={10} maxLength={2000} rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the idea, current progress, and what the team will work on…" className={`${fieldClass} mt-1.5 resize-y`} /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Skills needed<input value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} placeholder="React, UI design, Node.js" className={`${fieldClass} mt-1.5`} /></label><label className="text-xs font-semibold">Roles to fill<input value={form.roles} onChange={(event) => setForm((current) => ({ ...current, roles: event.target.value }))} placeholder="Frontend developer, Designer" className={`${fieldClass} mt-1.5`} /></label></div>
        <div className="mt-4 flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2.5 text-sm font-bold shadow-[0_2px_0_#191a32] disabled:cursor-wait disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}{saving ? "Posting…" : "Publish project"}</button></div>
      </form>}

      <section className="mb-6 rounded-[20px] border-2 border-[#191a32] bg-white p-3 shadow-[3px_4px_0_#c9bcff] sm:p-4"><div className="relative"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#858191]" /><input type="search" value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); }} placeholder="Search projects, skills or roles…" style={{ paddingLeft: "2.75rem" }} className={fieldClass} /></div></section>

      {pendingRequestCount > 0 && <a href="#your-projects" className="mb-7 flex items-center justify-between gap-3 rounded-2xl border-2 border-[#191a32] bg-[#fff3b7] px-4 py-3 shadow-[2px_3px_0_#191a32] transition hover:-translate-y-0.5 sm:px-5"><span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e9d56a] bg-white text-[#6f56d9]"><Users size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-extrabold">Your team needs you</span><span className="mt-0.5 block truncate text-xs text-[#6e6a7b]">{pendingRequestCount} new {pendingRequestCount === 1 ? "student wants" : "students want"} to join your project</span></span></span><span className="shrink-0 rounded-lg border border-[#191a32] bg-white px-3 py-2 text-xs font-bold">Review</span></a>}

      <section><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-extrabold">Open opportunities</h2><p className="mt-1 text-xs text-[#6e6a7b]">Projects recruiting teammates right now.</p></div><span className="text-xs text-[#858191]">{loading ? "Loading…" : `${discoverProjects.length} projects`}</span></div>
        {loading ? <div role="status" className="rounded-[24px] border-2 border-[#191a32] bg-white p-10 text-center text-sm text-[#6e6a7b]"><LoaderCircle size={22} className="mx-auto animate-spin text-[#6f56d9]" /><span className="mt-2 block">Finding student projects…</span></div>
          : discoverProjects.length ? <div className="grid gap-4 lg:grid-cols-2">{discoverProjects.map((project) => <ProjectCard key={project.id} project={project} user={user} onRequested={requestToJoin} busyKey={busyKey} />)}</div>
            : <div className="rounded-[24px] border-2 border-[#191a32] bg-white px-5 py-7 text-center shadow-[3px_4px_0_#c9bcff] sm:py-8"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eee9ff] text-[#6f56d9]"><FolderKanban size={23} /></span><h3 className="mt-3 font-bold">No open projects found</h3><p className="mt-1 text-sm text-[#6e6a7b]">Try another search or post a project idea.</p><button type="button" onClick={() => { setSearch(""); setShowCreateForm(true); }} className="mt-3 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2 text-sm font-bold shadow-[0_2px_0_#191a32]">Start a project</button></div>}
      </section>

      {joinedProjects.length > 0 && <section className="mt-9"><div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Your teams</p><h2 className="mt-1 text-xl font-extrabold">Projects you’ve joined</h2></div><div className="grid gap-3 sm:grid-cols-2">{joinedProjects.map((project) => <article key={project.id} className="flex items-center gap-3 rounded-[20px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#c9bcff]"><ProfileAvatar person={project.owner} /><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold">{project.title}</h3><p className="mt-1 truncate text-xs text-[#6e6a7b]">Led by {project.owner.name} · {project.memberCount}/{project.teamSize} teammates</p></div><Link to={`/projects/${project.id}`} aria-label={`Open ${project.title} workspace`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#191a32] bg-[#ffe35b] px-2.5 py-2 text-xs font-bold">Workspace<ArrowRight size={13} /></Link></article>)}</div></section>}

      {myProjects.length > 0 && <section id="your-projects" className="mt-9 scroll-mt-24"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f56d9]">Team inbox</p><h2 className="mt-1 text-xl font-extrabold">Your projects and requests</h2><p className="mt-1 text-xs text-[#6e6a7b]">Manage your projects and review join requests.</p></div><span className="shrink-0 rounded-full bg-[#fff3b7] px-3 py-1.5 text-xs font-bold text-[#715b00]">{pendingRequestCount} pending</span></div><div className="space-y-4">{myProjects.map((project) => <article key={project.id} className="rounded-[22px] border-2 border-[#191a32] bg-white p-4 shadow-[3px_4px_0_#ffe35b] sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-extrabold">{project.title}</h3><p className="mt-1 text-xs capitalize text-[#6e6a7b]">{project.memberCount}/{project.teamSize} teammates · {project.status}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eee9ff] px-3 py-1 text-xs font-bold text-[#5947a8]">{project.requests.filter((request) => request.status === "pending").length} pending</span><Link to={`/projects/${project.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#191a32] bg-[#ffe35b] px-3 py-2 text-xs font-bold">Workspace<ArrowRight size={13} /></Link></div></div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e7dfd0] pt-3">
            <button type="button" onClick={() => startProjectEdit(project)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d9cffb] bg-[#f7f4ff] px-3 py-2 text-xs font-bold text-[#5947a8] hover:bg-[#eee9ff]"><Pencil size={13} />Edit project</button>
            {project.status === "completed" ? <button type="button" onClick={() => setConfirmProjectAction({ project, action: "reopen" })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7eadf] bg-[#f1fbf4] px-3 py-2 text-xs font-bold text-[#28734d] hover:bg-[#e8f7ee]"><RotateCcw size={13} />Reopen</button> : <button type="button" onClick={() => setConfirmProjectAction({ project, action: "complete" })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7eadf] bg-[#f1fbf4] px-3 py-2 text-xs font-bold text-[#28734d] hover:bg-[#e8f7ee]"><CheckCircle2 size={14} />Mark complete</button>}
            <button type="button" onClick={() => setConfirmProjectAction({ project, action: "delete" })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#f0d4d4] bg-white px-3 py-2 text-xs font-bold text-[#a33b48] hover:bg-[#fff1f1]"><Trash2 size={13} />Delete</button>
          </div>
          {project.requests.filter((request) => request.status === "pending").length ? <div className="mt-3 divide-y divide-[#e7dfd0]">{project.requests.filter((request) => request.status === "pending").map((request) => <div key={request.id} className="flex flex-wrap items-start gap-3 py-3"><Link to={`/profile/${request.applicant?.id}`}><ProfileAvatar person={request.applicant} /></Link><div className="min-w-0 flex-1"><p className="text-sm font-bold"><Link to={`/profile/${request.applicant?.id}`} className="hover:text-[#5947a8]">{request.applicant?.name || "Student"}</Link></p><p className="mt-0.5 text-xs text-[#6e6a7b]">{request.applicant?.headline}{request.applicant?.university ? ` · ${request.applicant.university}` : ""}</p>{request.message && <p className="mt-2 rounded-xl bg-[#fff9e8] p-2.5 text-sm text-[#514e62]">{request.message}</p>}{request.applicant?.skills?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{request.applicant.skills.slice(0, 6).map((skill) => <span key={skill} className="rounded-md bg-[#eee9ff] px-2 py-1 text-[10px] text-[#5947a8]">{skill}</span>)}</div>}</div><div className="flex gap-2"><button type="button" disabled={Boolean(busyKey) || ["completed", "closed", "full"].includes(project.status)} onClick={() => decideRequest(project.id, request.id, "accept")} className="rounded-lg border-2 border-[#191a32] bg-[#ffe35b] px-3 py-2 text-xs font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50">{busyKey === `decision-${request.id}` ? "…" : "Accept"}</button><button type="button" disabled={Boolean(busyKey)} onClick={() => decideRequest(project.id, request.id, "reject")} className="rounded-lg border border-[#e7dfd0] px-3 py-2 text-xs font-semibold text-[#514e62] hover:bg-[#f4f0e8] disabled:opacity-50">Decline</button></div></div>)}</div> : <p className="mt-3 rounded-xl bg-[#fffdf9] p-3 text-sm text-[#858191]">No pending join requests yet.</p>}
        </article>)}</div></section>}

      {editingProject && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#17182d]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyKey) setEditingProject(null); }}><section role="dialog" aria-modal="true" aria-labelledby="edit-project-title" className="my-auto w-full max-w-2xl rounded-[24px] border-2 border-[#191a32] bg-white p-5 shadow-[5px_6px_0_#c9bcff] sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 id="edit-project-title" className="text-xl font-extrabold">Edit project</h2><p className="mt-1 text-sm text-[#6e6a7b]">Update the project details your team and students see.</p></div><button type="button" disabled={Boolean(busyKey)} onClick={() => setEditingProject(null)} aria-label="Close edit project" className="rounded-lg p-2 text-[#6e6a7b] hover:bg-[#f4f0e8] disabled:opacity-50"><X size={19} /></button></div><form onSubmit={saveProjectEdit} className="mt-5 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Project name<input required minLength={3} maxLength={100} value={editProjectForm.title} onChange={(event) => setEditProjectForm((current) => ({ ...current, title: event.target.value }))} className={`${fieldClass} mt-1.5`} /></label><label className="text-xs font-bold">Team size (including you)<input required type="number" min={2} max={12} value={editProjectForm.teamSize} onChange={(event) => setEditProjectForm((current) => ({ ...current, teamSize: event.target.value }))} className={`${fieldClass} mt-1.5`} /></label></div><label className="block text-xs font-bold">Description<textarea required minLength={10} maxLength={2000} rows={4} value={editProjectForm.description} onChange={(event) => setEditProjectForm((current) => ({ ...current, description: event.target.value }))} className={`${fieldClass} mt-1.5 resize-y`} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Skills needed<input value={editProjectForm.skills} onChange={(event) => setEditProjectForm((current) => ({ ...current, skills: event.target.value }))} placeholder="React, Node.js" className={`${fieldClass} mt-1.5`} /></label><label className="text-xs font-bold">Roles to fill<input value={editProjectForm.roles} onChange={(event) => setEditProjectForm((current) => ({ ...current, roles: event.target.value }))} placeholder="Frontend developer" className={`${fieldClass} mt-1.5`} /></label></div>{error && <p role="alert" className="text-sm text-[#a33b48]">{error}</p>}<div className="flex flex-wrap justify-end gap-2 pt-2"><button type="button" disabled={Boolean(busyKey)} onClick={() => setEditingProject(null)} className="min-h-10 rounded-xl border border-[#e7dfd0] px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="submit" disabled={Boolean(busyKey)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-2 text-sm font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50">{busyKey === `edit-project-${editingProject.id}` ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{busyKey === `edit-project-${editingProject.id}` ? "Saving…" : "Save changes"}</button></div></form></section></div>}

      {confirmProjectAction && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#17182d]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyKey) setConfirmProjectAction(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="project-action-title" aria-describedby="project-action-description" className="w-full max-w-md rounded-[24px] border-2 border-[#191a32] bg-white p-5 shadow-[5px_6px_0_#c9bcff] sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 id="project-action-title" className="text-lg font-extrabold">{confirmProjectAction.action === "delete" ? "Delete this project?" : confirmProjectAction.action === "complete" ? "Mark project complete?" : "Reopen this project?"}</h2><p id="project-action-description" className="mt-2 text-sm leading-6 text-[#6e6a7b]">{confirmProjectAction.action === "delete" ? `“${confirmProjectAction.project.title}” and its workspace will be permanently removed. Project notifications will also be cleared.` : confirmProjectAction.action === "complete" ? `“${confirmProjectAction.project.title}” will stop accepting join requests. Its workspace will remain available to the current team.` : `“${confirmProjectAction.project.title}” will be open to new join requests again.`}</p></div><button type="button" disabled={Boolean(busyKey)} onClick={() => setConfirmProjectAction(null)} aria-label="Cancel project action" className="rounded-lg p-2 text-[#6e6a7b] hover:bg-[#f4f0e8] disabled:opacity-50"><X size={19} /></button></div><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={Boolean(busyKey)} onClick={() => setConfirmProjectAction(null)} className="min-h-10 rounded-xl border border-[#e7dfd0] px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="button" disabled={Boolean(busyKey)} onClick={confirmProjectChange} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border-2 border-[#191a32] px-4 py-2 text-sm font-bold shadow-[0_2px_0_#191a32] disabled:opacity-50 ${confirmProjectAction.action === "delete" ? "bg-[#fff1f1] text-[#a33b48]" : "bg-[#ffe35b] text-[#17182d]"}`}>{busyKey === `delete-project-${confirmProjectAction.project.id}` ? <LoaderCircle size={15} className="animate-spin" /> : confirmProjectAction.action === "delete" ? <Trash2 size={15} /> : confirmProjectAction.action === "complete" ? <CheckCircle2 size={15} /> : <RotateCcw size={15} />}{busyKey === `delete-project-${confirmProjectAction.project.id}` ? "Deleting…" : confirmProjectAction.action === "delete" ? "Delete project" : confirmProjectAction.action === "complete" ? "Mark complete" : "Reopen project"}</button></div></section></div>}
    </main>
  </div>;
}
