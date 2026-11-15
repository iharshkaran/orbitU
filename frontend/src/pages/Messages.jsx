import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Send, MessageCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import { api } from "../utils/api";
import { useConnectlyStore } from "../store/useConnectlyStore";
import { subscribeMessageEvents } from "../utils/messageEvents";

function mergeChats(network, inbox) {
  const inboxItems = Array.isArray(inbox) ? inbox : [];
  const connectedItems = Array.isArray(network?.connected) ? network.connected : [];
  const inboxById = new Map(inboxItems.map((chat) => [chat.userId, chat]));
  const connected = connectedItems.map((person) => ({
    ...person,
    userId: person.studentId,
    lastMessage: inboxById.get(person.studentId)?.lastMessage || "Start a conversation",
    lastMessageAt: inboxById.get(person.studentId)?.lastMessageAt || null,
    unreadCount: inboxById.get(person.studentId)?.unreadCount || 0,
  }));
  const known = new Set(connected.map((chat) => chat.userId));
  return [...inboxItems.filter((chat) => !known.has(chat.userId)), ...connected]
    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
}

function messageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Messages() {
  const cachedConnections = useConnectlyStore.getState().connections;
  const cachedInbox = useConnectlyStore.getState().inbox;
  const [chats, setChats] = useState(() => mergeChats(cachedConnections, cachedInbox));
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(() => cachedConnections === null && cachedInbox === null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef(null);
  const active = chats.find((chat) => chat.userId === activeId);
  const latestOutgoingId = [...messages].reverse().find((message) => message.from === "you")?.id;
  const visibleChats = useMemo(() => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())), [chats, query]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let mounted = true;
    const refreshInbox = (force = false) => Promise.all([useConnectlyStore.getState().loadConnections(), useConnectlyStore.getState().loadInbox(force)])
      .then(([network, inbox]) => {
        if (!mounted) return;
        setChats(mergeChats(network, inbox));
        setError("");
      })
      .catch((requestError) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setLoading(false); });
    refreshInbox();
    const timer = window.setInterval(() => refreshInbox(), 15000);
    const refreshAfterMessage = () => refreshInbox(true);
    window.addEventListener("connectly:message-update", refreshAfterMessage);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener("connectly:message-update", refreshAfterMessage); };
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    let mounted = true;
    const load = () => api.messageThread(activeId)
      .then((items) => { if (mounted) { setMessages(items); setChats((current) => current.map((chat) => chat.userId === activeId ? { ...chat, unreadCount: 0 } : chat)); setError(""); } })
      .catch((requestError) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setThreadLoading(false); });
    load();
    return () => { mounted = false; };
  }, [activeId]);

  useEffect(() => subscribeMessageEvents(({ type, data }) => {
    if (type === "message") {
      const incoming = data.message;
      setChats((current) => current.map((chat) => chat.userId === data.conversationId ? {
        ...chat,
        lastMessage: incoming.text,
        lastMessageAt: incoming.createdAt,
        unreadCount: data.conversationId === activeId || incoming.from === "you" ? 0 : chat.unreadCount + 1,
      } : chat).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
      if (data.conversationId === activeId) {
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
        if (incoming.from === "them") {
          api.messageThread(activeId).then(setMessages).catch(() => {});
        }
      }
      window.dispatchEvent(new Event("connectly:message-update"));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } else if (type === "read" && data.conversationId === activeId) {
      setMessages((current) => current.map((message) => message.from === "you" ? { ...message, readAt: data.readAt } : message));
    }
  }), [activeId]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [activeId, messages, threadLoading]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !active || sending) return;
    setError("");
    setSending(true);
    try {
      const message = await api.sendMessage(activeId, text);
      useConnectlyStore.getState().loadInbox(true).catch(() => {});
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setChats((current) => current.map((chat) => chat.userId === activeId ? { ...chat, lastMessage: text, lastMessageAt: message.createdAt } : chat).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
      setDraft("");
      window.dispatchEvent(new Event("connectly:message-update"));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
    finally { setSending(false); }
  }

  return <div className="min-h-screen orbit-pattern-bg text-[#17182d]"><Navbar /><main className="mx-auto max-w-6xl px-4 py-4 pb-24 sm:px-6 md:py-5 md:pb-8 lg:px-8">
    {error && <p role="alert" className="mb-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-[#a33b48]">{error}</p>}
    <section className="grid h-[calc(100dvh-11rem)] min-h-[480px] max-h-[900px] overflow-hidden rounded-[26px] border-2 border-[#191a32] bg-white shadow-[4px_5px_0_#c9bcff] md:h-[calc(100dvh-9.5rem)] md:min-h-[540px] md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={`${activeId ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col border-b border-[#e7dfd0] bg-[#fffdf9] md:border-b-0 md:border-r`}>
        <div className="shrink-0 border-b border-[#e7dfd0] bg-white/80 p-4">
          <div className="mb-3 flex items-center justify-between"><div><h1 className="text-lg font-extrabold">Messages</h1><p className="mt-0.5 text-xs text-[#858191]">Your student connections</p></div><span className="rounded-full bg-[#eee9ff] px-2.5 py-1 text-[11px] font-bold text-[#5947a8]">{chats.length}</span></div>
          <label className="flex items-center gap-2 rounded-2xl border-2 border-[#e7dfd0] bg-[#fffdf9] px-3 transition focus-within:border-[#7660dc]"><Search size={16} className="shrink-0 text-[#858191]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent py-2.5 text-sm outline-none"/></label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {visibleChats.map((chat) => <button key={chat.userId} onClick={() => { if (activeId !== chat.userId) { setMessages([]); setThreadLoading(true); } setActiveId(chat.userId); }} className={`flex w-full items-center gap-3 border-b border-[#e7dfd0]/80 p-3.5 text-left transition hover:bg-[#f4f0e8] ${activeId === chat.userId ? "bg-[#eee9ff]" : ""}`}>
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] font-bold text-[#5947a8]">{chat.photo ? <img src={chat.photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : chat.initials || chat.name.split(" ").map((part) => part[0]).join("")}{chat.unreadCount > 0 && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#52b788]" />}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{chat.name}</span>{chat.lastMessageAt && <time className="shrink-0 text-[10px] text-[#858191]">{messageTime(chat.lastMessageAt)}</time>}</span><span className={`mt-1 block truncate text-xs ${chat.unreadCount > 0 ? "font-semibold text-[#343247]" : "text-[#6e6a7b]"}`}>{chat.lastMessage}</span></span>
            {chat.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#ffe35b] px-1 text-[10px] font-bold text-[#17182d]">{chat.unreadCount > 9 ? "9+" : chat.unreadCount}</span>}
          </button>)}
          {!loading && !visibleChats.length && <div className="p-5 text-sm text-[#858191]">{query ? "No matching conversations." : <>You can message accepted connections. <Link to="/explore" className="font-semibold text-[#6f56d9] hover:text-[#5947a8]">Explore students</Link></>}</div>}
          {loading && <p className="p-5 text-sm text-[#858191]">Loading conversations…</p>}
        </div>
      </aside>
      {active ? <div className="flex min-h-0 min-w-0 flex-col bg-[#fffdf9]">
        <header className="z-10 flex shrink-0 items-center gap-3 border-b border-[#e7dfd0] bg-white px-4 py-3 sm:px-5">
          <button type="button" onClick={() => { setActiveId(""); setMessages([]); setDraft(""); setError(""); }} aria-label="Back to connections" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7dfd0] text-[#514e62] transition hover:bg-[#f4f0e8] md:hidden"><ArrowLeft size={18} /></button>
          <Link to={`/profile/${active.studentId || active.userId}`} aria-label={`Open ${active.name}'s profile`} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] font-bold text-[#5947a8]">{active.photo ? <img src={active.photo} alt="" decoding="async" className="h-full w-full object-cover"/> : active.name.split(" ").map((part) => part[0]).join("")}</Link>
          <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">{active.name}</h2><p className="truncate text-xs text-[#6e6a7b]">{active.role || "OrbitU student"}</p></div>
          <span className="hidden items-center gap-1.5 rounded-full bg-[#e8f6ef] px-2.5 py-1 text-[10px] font-semibold text-[#28734d] sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[#52b788]"/>Connection</span>
        </header>
        <div ref={threadRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[#faf8f3] px-3 py-4 sm:px-5 sm:py-5">
          {threadLoading && messages.length === 0 ? <div className="m-auto flex items-center gap-2 text-sm text-[#858191]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#7660dc]/30 border-t-[#7660dc]"/>Loading conversation…</div> : messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-sm leading-6 sm:max-w-[76%] sm:px-4 ${message.from === "you" ? "self-end rounded-br-md border-[#dfc941] bg-[#ffe96b] text-[#17182d] shadow-[0_2px_0_#e4d04d]" : "self-start rounded-bl-md border-[#ddd5f2] bg-white text-[#343247] shadow-sm"}`}><p className="whitespace-pre-wrap break-words">{message.text}</p><div className={`mt-1 flex items-center gap-1.5 text-[10px] leading-4 ${message.from === "you" ? "justify-end text-[#625b37]" : "text-[#858191]"}`}><time>{messageTime(message.createdAt)}</time>{message.from === "you" && message.id === latestOutgoingId && <span aria-label={message.readAt ? "Seen" : "Sent"}>· {message.readAt ? "Seen" : "Sent"}</span>}</div></div>)}
          {!threadLoading && messages.length === 0 && <div className="m-auto max-w-xs text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee9ff] text-[#6f56d9]"><MessageCircle size={23}/></span><p className="mt-3 text-sm font-semibold text-[#514e62]">Start a conversation</p><p className="mt-1 text-xs text-[#858191]">Send {active.name.split(" ")[0]} a message to get things going.</p></div>}
        </div>
        <form onSubmit={sendMessage} className="flex shrink-0 items-end gap-2 border-t border-[#e7dfd0] bg-white p-3 sm:gap-3 sm:p-4">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder={`Message ${active.name.split(" ")[0]}…`} className="min-h-11 min-w-0 flex-1 rounded-2xl border-2 border-[#e7dfd0] bg-[#fffdf9] px-4 py-2.5 text-sm outline-none transition focus:border-[#7660dc]"/>
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3.5 font-bold text-black shadow-[0_3px_0_#191a32] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50 sm:px-4">{sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17182d]/30 border-t-[#17182d]" /> : <Send size={17}/>}<span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></button>
        </form>
      </div> : <div className="hidden min-h-0 flex-col items-center justify-center bg-[#faf8f3] p-8 text-center text-[#858191] md:flex"><span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#191a32] bg-[#eee9ff] text-[#5947a8] shadow-[3px_4px_0_#c9bcff]"><MessageCircle size={30}/></span><p className="mt-5 font-semibold text-[#514e62]">Choose a conversation to get started.</p><p className="mt-1 text-sm">A quick hello can turn into something great.</p></div>}
    </section>
  </main></div>;
}
