import { useMemo, useState } from "react";
import { MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";
import { api } from "../utils/api";

function CommentItem({ comment, currentUserId, postId, onChange, onError, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.text);
  const [busy, setBusy] = useState(false);
  const isAuthor = comment.authorId === currentUserId;

  async function submitReply(event) {
    event.preventDefault();
    const text = replyDraft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const saved = await api.replyToComment(postId, comment.id, text);
      onChange((current) => [...current, saved]);
      setReplyDraft("");
      setReplying(false);
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function saveEdit(event) {
    event.preventDefault();
    const text = editDraft.trim();
    if (!text || busy || text === comment.text) { setEditing(false); return; }
    setBusy(true);
    try {
      const updated = await api.updateComment(postId, comment.id, text);
      onChange((current) => current.map((item) => item.id === comment.id ? updated : item));
      setEditing(false);
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  async function removeComment() {
    if (busy || !window.confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      await api.deleteComment(postId, comment.id);
      onChange((current) => current.filter((item) => item.id !== comment.id && item.parentId !== comment.id));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }

  return <div className={`flex items-start gap-2.5 ${depth ? "ml-8 border-l-2 border-[#e7dfd0] pl-3" : ""}`}>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8d0c1] bg-[#c9bcff] text-xs font-semibold text-[#5947a8]">
      {comment.photo ? <img src={comment.photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : comment.name?.charAt(0)}
    </div>
    <div className="min-w-0 flex-1 rounded-xl bg-[#f4f0e8] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{comment.name}</p>
          {comment.updatedAt && new Date(comment.updatedAt) > new Date(comment.createdAt) && <span className="text-[10px] text-[#858191]">Edited</span>}
        </div>
        {isAuthor && !editing && <div className="flex shrink-0 items-center gap-1">
          <button type="button" disabled={busy} onClick={() => { setEditDraft(comment.text); setEditing(true); setReplying(false); }} aria-label="Edit comment" title="Edit comment" className="rounded-md p-1 text-[#6e6a7b] hover:bg-white hover:text-[#5947a8] disabled:opacity-50"><Pencil size={13} /></button>
          <button type="button" disabled={busy} onClick={removeComment} aria-label="Delete comment" title="Delete comment" className="rounded-md p-1 text-[#8f5960] hover:bg-white hover:text-red-700 disabled:opacity-50"><Trash2 size={13} /></button>
        </div>}
      </div>
      {editing ? <form onSubmit={saveEdit} className="mt-2 space-y-2">
        <textarea autoFocus value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={500} rows={2} className="w-full resize-y rounded-lg border border-[#e7dfd0] bg-white px-2.5 py-2 text-sm outline-none focus:border-[#7660dc]" />
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg px-2.5 py-1 text-xs text-[#6e6a7b] hover:bg-white">Cancel</button><button type="submit" disabled={!editDraft.trim() || busy} className="rounded-lg bg-[#ffe35b] px-3 py-1 text-xs font-semibold text-black disabled:opacity-50">{busy ? "Saving…" : "Save"}</button></div>
      </form> : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#514e62]">{comment.text}</p>}
      {!editing && <div className="mt-1.5 flex items-center gap-3">
        {!depth && <button type="button" onClick={() => { setReplying((value) => !value); setEditing(false); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6f56d9] hover:text-[#4b36ad]"><MessageCircle size={12} /> Reply</button>}
        {comment.createdAt && <time className="text-[10px] text-[#858191]">{new Date(comment.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</time>}
      </div>}
      {replying && <form onSubmit={submitReply} className="mt-2 flex gap-2">
        <input autoFocus value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} maxLength={500} placeholder={`Reply to ${comment.name}…`} className="min-w-0 flex-1 rounded-lg border border-[#e7dfd0] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#7660dc]" />
        <button type="submit" disabled={!replyDraft.trim() || busy} aria-label="Send reply" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#191a32] bg-[#ffe35b] text-black disabled:opacity-50">{busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black" /> : <Send size={14} />}</button>
        <button type="button" onClick={() => setReplying(false)} aria-label="Cancel reply" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e7dfd0] text-[#6e6a7b]"><X size={14} /></button>
      </form>}
    </div>
  </div>;
}

export default function CommentThread({ postId, comments = [], currentUserId, onChange, onError }) {
  const { roots, replies } = useMemo(() => {
    const rootComments = comments.filter((comment) => !comment.parentId);
    const replyComments = new Map();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const items = replyComments.get(comment.parentId) || [];
      items.push(comment);
      replyComments.set(comment.parentId, items);
    }
    return { roots: rootComments, replies: replyComments };
  }, [comments]);

  return <div className="space-y-3">
    {roots.map((comment) => <div key={comment.id} className="space-y-2.5">
      <CommentItem comment={comment} currentUserId={currentUserId} postId={postId} onChange={onChange} onError={onError} />
      {(replies.get(comment.id) || []).map((reply) => <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} postId={postId} onChange={onChange} onError={onError} depth={1} />)}
    </div>)}
    {comments.length === 0 && <p className="text-xs text-[#858191]">No comments yet. Start the conversation!</p>}
  </div>;
}
