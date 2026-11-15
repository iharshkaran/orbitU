import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, LoaderCircle, X } from "lucide-react";
import { api } from "../utils/api";

export default function PostLikesModal({ postId, onClose }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let active = true;
    const closeOnEscape = (event) => { if (event.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", closeOnEscape);
    api.postLikes(postId)
      .then((result) => { if (active) setPeople(Array.isArray(result) ? result : []); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; document.removeEventListener("keydown", closeOnEscape); };
  }, [postId]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#17182d]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="post-likes-title" className="flex max-h-[min(80vh,34rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-[#191a32] bg-white shadow-[6px_7px_0_#c9bcff]">
        <header className="flex items-center justify-between border-b border-[#e7dfd0] px-5 py-4">
          <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eee9ff] text-[#6f56d9]"><Heart size={18} fill="currentColor" /></span><div><h2 id="post-likes-title" className="font-bold">People who liked this</h2><p className="text-xs text-[#858191]">{people.length} {people.length === 1 ? "person" : "people"}</p></div></div>
          <button type="button" onClick={onClose} aria-label="Close likes" className="rounded-xl p-2 text-[#6e6a7b] transition hover:bg-[#f4f0e8] hover:text-[#17182d]"><X size={19} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6e6a7b]"><LoaderCircle size={18} className="animate-spin" />Loading likes…</div>}
          {!loading && error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {!loading && !error && people.length === 0 && <div className="py-10 text-center"><Heart size={24} className="mx-auto text-[#9b8be8]" /><p className="mt-2 text-sm font-semibold">No likes yet</p><p className="mt-1 text-xs text-[#858191]">Be the first to like this post.</p></div>}
          {!loading && !error && people.map((person) => (
            <Link key={person.id} to={`/profile/${encodeURIComponent(person.id)}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-[#f4f0e8]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d8d0c1] bg-[#eee9ff] text-sm font-bold text-[#5947a8]">{person.photo ? <img src={person.photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : person.name?.charAt(0) || "S"}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#17182d]">{person.name}</span><span className="mt-0.5 block truncate text-xs text-[#858191]">{person.headline}</span></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
