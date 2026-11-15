import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, MoreHorizontal, Pencil, Reply, Search, Send, Smile, Trash2, X, MessageCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import { api } from "../utils/api";
import { useConnectlyStore } from "../store/useConnectlyStore";
import { subscribeMessageEvents } from "../utils/messageEvents";
import { useAuth } from "../context/useAuth";

const QUICK_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "🙏", "👏", "🎉"];
const FLAG_CODES = "AC AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CP CR CU CV CW CX CY CZ DE DG DJ DK DM DO DZ EA EC EE EG EH ER ES ET EU FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU IC ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TA TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM UN US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");
const FLAG_EMOJIS = FLAG_CODES.map((code) => String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)));
const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 🙂‍↔️ 😏 😒 🙂‍↔️ 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 😶‍🌫️ 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🫥 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 💀 ☠️ 👻 👽 👾 🤖 💩".split(" ") },
  { name: "People", emojis: "👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 🫷 🫸 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 🧔‍♂️ 🧔‍♀️ 👨‍🦰 👨‍🦱 👨‍🦳 👨‍🦲 👩 👩‍🦰 👩‍🦱 👩‍🦳 👩‍🦲 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🫅 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🫄 🤱 👩‍🍼 👨‍🍼 🧑‍🍼 👼 🎅 🤶 🧑‍🎄 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌".split(" ") },
  { name: "Animals", emojis: "🐵 🙈 🙉 🙊 🐒 🦍 🦧 🐶 🐕 🦮 🐕‍🦺 🐩 🐺 🦊 🦝 🐱 🐈 🦁 🐯 🐅 🐆 🐴 🫎 🫏 🐎 🦄 🦓 🦌 🦬 🐮 🐂 🐃 🐄 🐷 🐖 🐗 🐽 🐏 🐑 🐐 🐪 🐫 🦙 🦒 🐘 🦣 🦏 🦛 🐭 🐁 🐀 🐹 🐰 🐇 🐿️ 🦫 🦔 🦇 🐻 🐻‍❄️ 🐨 🐼 🦥 🦦 🦨 🦘 🦡 🐾 🦃 🐔 🐓 🐣 🐤 🐥 🐦 🐧 🕊️ 🦅 🦆 🦢 🦉 🦤 🪶 🦩 🦚 🦜 🪽 🐸 🐊 🐢 🦎 🐍 🐲 🐉 🦕 🦖 🐳 🐋 🐬 🦭 🐟 🐠 🐡 🦈 🐙 🐚 🪸 🪼 🦀 🦞 🦐 🦑 🦪 🐌 🦋 🐛 🐜 🐝 🪲 🐞 🦗 🪳 🕷️ 🕸️ 🦂 🦟 🪰 🪱 🦠 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🪺 🪹 🍄 🌾 💐 🌷 🪷 🌹 🥀 🌺 🌸 🌼 🌻".split(" ") },
  { name: "Food", emojis: "🍇 🍈 🍉 🍊 🍋 🍋‍🟩 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🫐 🥝 🍅 🫒 🥥 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🥜 🫘 🌰 🫚 🫛 🍄‍🟫 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🫗 🥤 🧋 🧃 🧉 🧊".split(" ") },
  { name: "Travel", emojis: "🌍 🌎 🌏 🌐 🗺️ 🗾 🧭 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🏟️ 🏛️ 🏗️ 🧱 🪨 🪵 🛖 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️ 🎠 🛝 🎡 🎢 💈 🎪 🚂 🚃 🚄 🚅 🚆 🚇 🚈 🚉 🚊 🚝 🚞 🚋 🚌 🚍 🚎 🚐 🚑 🚒 🚓 🚔 🚕 🚖 🚗 🚘 🚙 🛻 🚚 🚛 🚜 🏎️ 🏍️ 🛵 🛺 🚲 🛴 🛹 🛼 🚏 🛣️ 🛤️ 🛢️ ⛽ 🛞 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🧳 🌌".split(" ") },
  { name: "Activities", emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🚣 🏊 🤽 🤾 🧗 🧗‍♀️ 🧗‍♂️ 🚴 🚵 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🎰 🧩 🪅 🪩 🪆 🧸 🪄 🎁 🎊 🎉 🎈".split(" ") },
  { name: "Objects", emojis: "💌 📩 📧 💻 🖥️ 🖨️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🎥 🎞️ 📽️ 🎬 📺 📷 📸 📹 📼 🔍 🔎 🕯️ 💡 🔦 🏮 🪔 📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📄 📰 🗞️ 📑 🔖 🏷️ 💰 🪙 💴 💵 💶 💷 💸 💳 🧾 💹 ✉️ 📦 📫 📪 📬 📭 📮 🗳️ ✏️ ✒️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 💼 📁 📂 🗂️ 📅 📆 🗒️ 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 ✂️ 🗃️ 🗄️ 🗑️ 🔒 🔓 🔏 🔐 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️ 🗡️ ⚔️ 💣 🪃 🏹 🛡️ 🪚 🔧 🪛 🔩 ⚙️ 🗜️ ⚖️ 🦯 🔗 ⛓️ 🪝 🧰 🧲 🪜 ⚗️ 🧪 🧫 🧬 🔬 🔭 📡 💉 🩸 💊 🩹 🩼 🩺 🩻 🚪 🛗 🪞 🪟 🛏️ 🛋️ 🪑 🚽 🪠 🚿 🛁 🪤 🪒 🧴 🧷 🧹 🧺 🧻 🪣 🧼 🫧 🪥 🧽 🧯 🛒 🚬 ⚰️ 🪦 ⚱️ 🧿 🪬 🪧".split(" ") },
  { name: "Symbols", emojis: "❤️ 🧡 💛 💚 💙 🩵 💜 🖤 🩶 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 💕 💞 💓 💗 💖 💘 💝 💟 ❣️ 💌 💋 💯 💢 💥 💫 💦 💨 🕳️ 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💟 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🛂 🛃 🛄 🛅 🚹 🚺 🚻 🚼 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 🔟 🔢 #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔀 🔁 🔂 ▶️ ⏩ ⏭️ ⏯️ ◀️ ⏪ ⏮️ 🔼 ⏫ 🔽 ⏬ ⏸️ ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 🔍 🔎 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 🔚 🔙 🔛 🔝 🔜 ☑️ ✔️ ❌ ✖️ ➰ ➿ 〽️ ✳️ ✴️ ❇️ ‼️〰️ ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🔀 🔁 🔂".split(" ") },
  { name: "Flags", emojis: FLAG_EMOJIS },
];

function groupedReactions(reactions = [], currentUserId) {
  const groups = new Map();
  for (const reaction of reactions) {
    const current = groups.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, selected: false };
    current.count += 1;
    current.selected ||= reaction.userId === currentUserId;
    groups.set(reaction.emoji, current);
  }
  return [...groups.values()];
}

function isEmojiOnly(value = "") {
  const text = value.trim();
  const emojiCharacter = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\uFE0F|\u200D|\u20E3|\s)/u;
  return Boolean(text) && [...text].every((character) => emojiCharacter.test(character));
}

function isSingleEmoji(value = "") {
  const text = value.trim();
  if (!isEmojiOnly(text)) return false;
  if (typeof Intl.Segmenter === "function") {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length === 1;
  }
  return [...text].filter((character) => /\p{Extended_Pictographic}/u.test(character)).length === 1;
}

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

function presenceLabel(presence) {
  if (presence?.online) return "Online";
  if (!presence?.lastSeenAt) return "Offline";
  const date = new Date(presence.lastSeenAt);
  if (Number.isNaN(date.getTime())) return "Offline";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `Last seen ${isToday ? `today at ${time}` : isYesterday ? `yesterday at ${time}` : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`;
}

export default function Messages() {
  const { user } = useAuth();
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
  const [presenceById, setPresenceById] = useState({});
  const [typingById, setTypingById] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("Smileys");
  const [messageMenuId, setMessageMenuId] = useState("");
  const [messageMenuPosition, setMessageMenuPosition] = useState(null);
  const [reactionPickerId, setReactionPickerId] = useState("");
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const [error, setError] = useState("");
  const threadRef = useRef(null);
  const composerRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const typingSentAtRef = useRef(new Map());
  const active = chats.find((chat) => chat.userId === activeId);
  const menuMessage = messages.find((message) => message.id === messageMenuId);
  const reactionPickerMessage = messages.find((message) => message.id === reactionPickerId);
  const activePresence = presenceById[activeId];
  const latestOutgoingId = [...messages].reverse().find((message) => message.from === "you")?.id;
  const visibleChats = useMemo(() => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())), [chats, query]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let mounted = true;
    const refreshInbox = (force = false) => Promise.all([
      useConnectlyStore.getState().loadConnections(),
      useConnectlyStore.getState().loadInbox(force),
      api.messagePresence().catch(() => []),
    ])
      .then(([network, inbox, presence]) => {
        if (!mounted) return;
        setChats(mergeChats(network, inbox));
        setPresenceById(Object.fromEntries(presence.map((item) => [item.userId, item])));
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
    if (type === "presence_snapshot") {
      const onlineIds = new Set(data.userIds || []);
      setPresenceById((current) => {
        const next = Object.fromEntries(Object.entries(current).map(([id, presence]) => [id, { ...presence, online: onlineIds.has(id), lastSeenAt: onlineIds.has(id) ? null : presence.lastSeenAt }]));
        for (const id of onlineIds) next[id] = { ...(next[id] || {}), online: true, lastSeenAt: null };
        return next;
      });
    } else if (type === "presence") {
      setPresenceById((current) => ({ ...current, [data.userId]: { online: data.online, lastSeenAt: data.lastSeenAt || null } }));
    } else if (type === "typing") {
      const peerId = data.conversationId;
      if (!peerId) return;
      setTypingById((current) => ({ ...current, [peerId]: true }));
      window.clearTimeout(typingTimersRef.current.get(peerId));
      typingTimersRef.current.set(peerId, window.setTimeout(() => {
        setTypingById((current) => ({ ...current, [peerId]: false }));
        typingTimersRef.current.delete(peerId);
      }, 2600));
    } else if (type === "message") {
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
    } else if (type === "message_update" && data.conversationId === activeId) {
      setMessages((current) => current.map((message) => message.id === data.message.id ? data.message : message));
      window.dispatchEvent(new Event("connectly:message-update"));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } else if (type === "message_delete") {
      if (data.conversationId === activeId) setMessages((current) => current.filter((message) => message.id !== data.messageId));
      useConnectlyStore.getState().loadInbox(true).catch(() => {});
      window.dispatchEvent(new Event("connectly:message-update"));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } else if (type === "read" && data.conversationId === activeId) {
      setMessages((current) => current.map((message) => message.from === "you" ? { ...message, readAt: data.readAt } : message));
    }
  }), [activeId]);

  useEffect(() => () => {
    for (const timer of typingTimersRef.current.values()) window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [activeId, messages, threadLoading, typingById]);

  useEffect(() => {
    if (replyingTo || editingMessageId) composerRef.current?.focus();
  }, [replyingTo, editingMessageId]);

  useEffect(() => {
    if (!messageMenuId && !reactionPickerId) return undefined;
    const closePopovers = () => {
      setMessageMenuId(""); setMessageMenuPosition(null);
      setReactionPickerId(""); setReactionPickerPosition(null);
    };
    window.addEventListener("scroll", closePopovers, true);
    window.addEventListener("resize", closePopovers);
    return () => {
      window.removeEventListener("scroll", closePopovers, true);
      window.removeEventListener("resize", closePopovers);
    };
  }, [messageMenuId, reactionPickerId]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !active || sending) return;
    const wasEditing = Boolean(editingMessageId);
    const wasEditingLatest = wasEditing && messages.at(-1)?.id === editingMessageId;
    setError("");
    setSending(true);
    try {
      const message = editingMessageId
        ? await api.editMessage(activeId, editingMessageId, text)
        : await api.sendMessage(activeId, text, replyingTo?.id);
      useConnectlyStore.getState().loadInbox(true).catch(() => {});
      setMessages((current) => editingMessageId
        ? current.map((item) => item.id === message.id ? message : item)
        : current.some((item) => item.id === message.id) ? current : [...current, message]);
      if (!wasEditing || wasEditingLatest) {
        setChats((current) => current.map((chat) => chat.userId === activeId ? { ...chat, lastMessage: text, ...(wasEditing ? {} : { lastMessageAt: message.createdAt }) } : chat).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
      }
      setDraft("");
      setReplyingTo(null);
      setEditingMessageId("");
      window.dispatchEvent(new Event("connectly:message-update"));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
    finally { setSending(false); }
  }

  async function reactToMessage(message, emoji) {
    try {
      const updated = await api.toggleMessageReaction(activeId, message.id, emoji);
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessageMenuId("");
      setMessageMenuPosition(null);
      setReactionPickerId("");
      setReactionPickerPosition(null);
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
  }

  function clearComposerModes() {
    setReplyingTo(null);
    setEditingMessageId("");
    setDraft("");
    composerRef.current?.focus();
  }

  function startReply(message) {
    setReplyingTo({ id: message.id, text: message.text, from: message.from, name: message.from === "you" ? user?.name || "You" : active?.name || "Student" });
    setEditingMessageId("");
    setDraft("");
    setMessageMenuId("");
    setMessageMenuPosition(null);
  }

  function startEdit(message) {
    setEditingMessageId(message.id);
    setReplyingTo(null);
    setDraft(message.text);
    setMessageMenuId("");
    setMessageMenuPosition(null);
  }

  async function deleteChatMessage(message) {
    if (!window.confirm("Delete this message for everyone?")) return;
    setError("");
    setMessageMenuId("");
    setMessageMenuPosition(null);
    try {
      await api.deleteMessage(activeId, message.id);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      useConnectlyStore.getState().loadInbox(true).catch(() => {});
      window.dispatchEvent(new Event("connectly:message-update"));
      window.dispatchEvent(new Event("connectly:backend-update"));
    } catch (requestError) { setError(requestError.message); }
  }

  function appendEmoji(emoji) {
    setDraft((current) => `${current}${emoji}`);
    setEmojiPickerOpen(false);
    composerRef.current?.focus();
  }

  function toggleMessageMenu(event, messageId) {
    if (messageMenuId === messageId) {
      setMessageMenuId("");
      setMessageMenuPosition(null);
      return;
    }
    setReactionPickerId("");
    setReactionPickerPosition(null);
    const bubbleRect = event.currentTarget.closest("[data-message-bubble]")?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
    const threadRect = threadRef.current?.getBoundingClientRect() || { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
    const targetMessage = messages.find((message) => message.id === messageId);
    const width = targetMessage?.from === "you" ? 260 : 132;
    const height = 48;
    const minLeft = threadRect.left + 8;
    const maxLeft = Math.max(minLeft, threadRect.right - width - 8);
    const leftFromBubble = targetMessage?.from === "you" ? bubbleRect.right - width : bubbleRect.left;
    const preferredTop = bubbleRect.top - height - 8;
    const top = preferredTop >= threadRect.top + 8
      ? preferredTop
      : Math.min(bubbleRect.bottom + 8, threadRect.bottom - height - 8);
    setMessageMenuPosition({
      left: Math.max(minLeft, Math.min(leftFromBubble, maxLeft)),
      top: Math.max(threadRect.top + 8, Math.min(top, threadRect.bottom - height - 8)),
      width,
    });
    setMessageMenuId(messageId);
  }

  function toggleReactionPicker(event, messageId) {
    if (reactionPickerId === messageId) {
      setReactionPickerId("");
      setReactionPickerPosition(null);
      return;
    }
    setMessageMenuId("");
    setMessageMenuPosition(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const height = 58;
    setReactionPickerPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(rect.top - height - 8, window.innerHeight - height - 8)),
      width,
    });
    setReactionPickerId(messageId);
  }

  function handleDraftChange(event) {
    const value = event.target.value;
    setDraft(value);
    if (!activeId || !value.trim()) return;
    const now = Date.now();
    const lastSent = typingSentAtRef.current.get(activeId) || 0;
    if (now - lastSent < 1200) return;
    typingSentAtRef.current.set(activeId, now);
    api.messageTyping(activeId).catch(() => {});
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
          {visibleChats.map((chat) => <button key={chat.userId} onClick={() => { if (activeId !== chat.userId) { setMessages([]); setThreadLoading(true); setDraft(""); setReplyingTo(null); setEditingMessageId(""); setMessageMenuId(""); setEmojiPickerOpen(false); } setActiveId(chat.userId); }} className={`flex w-full items-center gap-3 border-b border-[#e7dfd0]/80 p-3.5 text-left transition hover:bg-[#f4f0e8] ${activeId === chat.userId ? "bg-[#eee9ff]" : ""}`}>
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] font-bold text-[#5947a8]">{chat.photo ? <img src={chat.photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"/> : chat.initials || chat.name.split(" ").map((part) => part[0]).join("")}{presenceById[chat.userId]?.online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#36a86a]" />}</span>
            <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{chat.name}</span>{chat.lastMessageAt && <time className="shrink-0 text-[10px] text-[#858191]">{messageTime(chat.lastMessageAt)}</time>}</span><span className={`mt-1 block truncate text-xs ${chat.unreadCount > 0 ? "font-semibold text-[#343247]" : "text-[#6e6a7b]"}`}>{typingById[chat.userId] ? <span className="font-semibold text-[#6f56d9]">typing…</span> : chat.lastMessage}</span></span>
            {chat.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#ffe35b] px-1 text-[10px] font-bold text-[#17182d]">{chat.unreadCount > 9 ? "9+" : chat.unreadCount}</span>}
          </button>)}
          {!loading && !visibleChats.length && <div className="p-5 text-sm text-[#858191]">{query ? "No matching conversations." : <>You can message accepted connections. <Link to="/explore" className="font-semibold text-[#6f56d9] hover:text-[#5947a8]">Explore students</Link></>}</div>}
          {loading && <p className="p-5 text-sm text-[#858191]">Loading conversations…</p>}
        </div>
      </aside>
      {active ? <div className="flex min-h-0 min-w-0 flex-col bg-[#fffdf9]">
        <header className="z-10 flex shrink-0 items-center gap-3 border-b border-[#e7dfd0] bg-white px-4 py-3 sm:px-5">
          <button type="button" onClick={() => { setActiveId(""); setMessages([]); setDraft(""); setReplyingTo(null); setEditingMessageId(""); setMessageMenuId(""); setEmojiPickerOpen(false); setError(""); }} aria-label="Back to connections" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7dfd0] text-[#514e62] transition hover:bg-[#f4f0e8] md:hidden"><ArrowLeft size={18} /></button>
          <Link to={`/profile/${active.studentId || active.userId}`} aria-label={`Open ${active.name}'s profile`} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#191a32] bg-[#eee9ff] font-bold text-[#5947a8]">{active.photo ? <img src={active.photo} alt="" decoding="async" className="h-full w-full object-cover"/> : active.name.split(" ").map((part) => part[0]).join("")}</Link>
          <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">{active.name}</h2><p className="truncate text-xs text-[#6e6a7b]">{active.role || "OrbitU student"}</p></div>
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${activePresence?.online ? "bg-[#e8f6ef] text-[#28734d]" : "bg-[#f4f0e8] text-[#777386]"}`}>{activePresence?.online && <span className="h-1.5 w-1.5 rounded-full bg-[#36a86a]"/>}{typingById[activeId] ? "typing…" : presenceLabel(activePresence)}</span>
        </header>
        <div ref={threadRef} className="flex min-h-0 flex-1 flex-col justify-start gap-0.5 overflow-y-auto overscroll-contain bg-[#faf8f3] px-3 py-4 sm:px-5 sm:py-5">
          {threadLoading && messages.length === 0 ? <div className="m-auto flex items-center gap-2 text-sm text-[#858191]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#7660dc]/30 border-t-[#7660dc]"/>Loading conversation…</div> : messages.map((message) => {
            const reactions = groupedReactions(message.reactions, user?.id);
            const singleEmoji = isSingleEmoji(message.text);
            return <div key={message.id} className={`group relative flex max-w-[92%] flex-none flex-col sm:max-w-[82%] ${message.from === "you" ? "self-end items-end" : "self-start items-start"} ${reactions.length ? "pb-2" : ""}`}>
              <div data-message-bubble className={`relative w-fit max-w-full rounded-2xl border px-3.5 pt-2 ${reactions.length ? "pb-5" : "pb-2"} text-sm leading-5 sm:px-4 ${message.replyTo ? "min-w-[160px]" : ""} ${message.from === "you" ? "rounded-br-md border-[#dfc941] bg-[#ffe96b] text-[#17182d] shadow-[0_2px_0_#e4d04d]" : "rounded-bl-md border-[#ddd5f2] bg-white text-[#343247] shadow-sm"}`}>
                {message.replyTo && <div className={`mb-1 flex min-w-0 flex-col items-start gap-0 rounded-md border-l-2 px-2 py-1 ${message.from === "you" ? "border-[#7660dc] bg-white/45" : "border-[#7660dc] bg-[#f3efff]"}`}><span className="max-w-full truncate text-[10px] font-bold leading-3 text-[#5947a8]">{message.replyTo.from === "you" ? "You" : message.replyTo.name}</span><span className="max-w-full truncate text-[11px] leading-4 text-[#514e62]">{message.replyTo.text}</span></div>}
                <div className="flex w-fit max-w-full items-end gap-1">
                  <p className={`min-w-0 max-w-full whitespace-pre-wrap break-words ${singleEmoji ? "text-2xl leading-[1.15]" : ""}`}>{message.text}</p>
                  <div className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] leading-3 ${message.from === "you" ? "text-[#625b37]" : "text-[#858191]"}`}><button type="button" onClick={(event) => toggleReactionPicker(event, message.id)} aria-label="Add reaction" title="React to message" className="ml-1 rounded p-0.5 text-[#777386] transition hover:bg-black/5 hover:text-[#5947a8] opacity-100 md:opacity-0 md:group-hover:opacity-100"><Smile size={15}/></button><button type="button" onClick={(event) => toggleMessageMenu(event, message.id)} aria-label="Message options" title="Message options" className="rounded p-0.5 text-[#777386] opacity-100 transition hover:bg-black/5 hover:text-[#17182d] md:opacity-0 md:group-hover:opacity-100"><MoreHorizontal size={15}/></button>{message.editedAt && <span>Edited ·</span>}<time>{messageTime(message.createdAt)}</time>{message.from === "you" && message.id === latestOutgoingId && <span aria-label={message.readAt ? "Seen" : "Sent"}>· {message.readAt ? "Seen" : "Sent"}</span>}</div>
                </div>
                {reactions.length > 0 && <div className="absolute -bottom-2 left-2 z-10 flex max-w-[85%] flex-wrap justify-start gap-1">{reactions.map(({ emoji, count, selected }) => <button key={emoji} type="button" onClick={() => reactToMessage(message, emoji)} aria-label={`${emoji}, ${count} reactions`} className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs shadow-[0_2px_5px_rgba(25,26,50,0.16)] ${selected ? "border-[#b9a9ff] bg-[#f0ebff]" : "border-[#d7d1e4] bg-white"}`}>{emoji} <span className="text-[10px] font-semibold text-[#514e62]">{count}</span></button>)}</div>}
              </div>
            </div>;
          })}
          {typingById[activeId] && <div className="flex w-fit items-center gap-1 self-start rounded-2xl rounded-bl-md border border-[#ddd5f2] bg-white px-4 py-3 text-xs text-[#6f56d9] shadow-sm" aria-label={`${active.name} is typing`}><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7660dc] [animation-delay:-0.2s]"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7660dc] [animation-delay:-0.1s]"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7660dc]"/><span className="ml-1">{active.name.split(" ")[0]} is typing</span></div>}
          {!threadLoading && messages.length === 0 && !typingById[activeId] && <div className="m-auto max-w-xs text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee9ff] text-[#6f56d9]"><MessageCircle size={23}/></span><p className="mt-3 text-sm font-semibold text-[#514e62]">Start a conversation</p><p className="mt-1 text-xs text-[#858191]">Send {active.name.split(" ")[0]} a message to get things going.</p></div>}
        </div>
        <form onSubmit={sendMessage} className="shrink-0 border-t border-[#e7dfd0] bg-white p-3 sm:p-4">
          {(replyingTo || editingMessageId) && <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-[#7660dc] bg-[#f4f0ff] px-3 py-2">
            <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-[#5947a8]">{editingMessageId ? "Editing message" : `Replying to ${replyingTo.name}`}</p>{replyingTo && <p className="truncate text-xs text-[#6e6a7b]">{replyingTo.text}</p>}</div>
            <button type="button" onClick={clearComposerModes} aria-label="Cancel reply or edit" className="rounded-lg p-1 text-[#6e6a7b] hover:bg-white"><X size={16}/></button>
          </div>}
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="relative shrink-0">
              <button type="button" onClick={() => setEmojiPickerOpen((open) => !open)} aria-label="Choose emoji" title="Choose emoji" className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#e7dfd0] transition hover:bg-[#f4f0e8] ${emojiPickerOpen ? "bg-[#eee9ff] text-[#5947a8]" : "bg-white text-[#6e6a7b]"}`}><Smile size={19}/></button>
              {emojiPickerOpen && <div role="dialog" aria-label="Emoji picker" className="absolute bottom-full left-0 z-30 mb-2 overflow-hidden rounded-2xl border border-[#191a32] bg-white shadow-[3px_4px_0_#c9bcff]" style={{ width: "min(320px, calc(100vw - 2rem))" }}>
                <div className="flex gap-1 overflow-x-auto border-b border-[#e7dfd0] p-2">{EMOJI_CATEGORIES.map(({ name, emojis }) => <button key={name} type="button" onClick={() => setEmojiCategory(name)} aria-label={name} title={name} className={`shrink-0 rounded-lg px-2 py-1.5 text-base transition ${emojiCategory === name ? "bg-[#eee9ff] text-[#5947a8]" : "text-[#6e6a7b] hover:bg-[#f4f0e8]"}`}>{emojis[0]}</button>)}</div>
                <div className="max-h-56 overflow-y-auto p-2"><p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-[#858191]">{emojiCategory}</p><div className="grid grid-cols-8 gap-0.5">{(EMOJI_CATEGORIES.find(({ name }) => name === emojiCategory)?.emojis || []).map((emoji, index) => <button key={`${emoji}-${index}`} type="button" onClick={() => appendEmoji(emoji)} aria-label={`Add ${emoji}`} className="flex h-9 items-center justify-center rounded-lg text-xl transition hover:bg-[#f4f0e8]">{emoji}</button>)}</div></div>
              </div>}
            </div>
            <input ref={composerRef} value={draft} onChange={handleDraftChange} maxLength={2000} placeholder={editingMessageId ? "Edit your message…" : replyingTo ? `Reply to ${replyingTo.name}…` : `Message ${active.name.split(" ")[0]}…`} className="min-h-11 min-w-0 flex-1 rounded-2xl border-2 border-[#e7dfd0] bg-[#fffdf9] px-4 py-2.5 text-sm outline-none transition focus:border-[#7660dc]"/>
            <button type="submit" disabled={!draft.trim() || sending} aria-label={editingMessageId ? "Save message" : "Send message"} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-3.5 font-bold text-black shadow-[0_3px_0_#191a32] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50 sm:px-4">{sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17182d]/30 border-t-[#17182d]" /> : editingMessageId ? <Check size={17}/> : <Send size={17}/>}<span className="hidden sm:inline">{sending ? "Saving…" : editingMessageId ? "Save" : "Send"}</span></button>
          </div>
        </form>
      </div> : <div className="hidden min-h-0 flex-col items-center justify-center bg-[#faf8f3] p-8 text-center text-[#858191] md:flex"><span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#191a32] bg-[#eee9ff] text-[#5947a8] shadow-[3px_4px_0_#c9bcff]"><MessageCircle size={30}/></span><p className="mt-5 font-semibold text-[#514e62]">Choose a conversation to get started.</p><p className="mt-1 text-sm">A quick hello can turn into something great.</p></div>}
    </section>
    {menuMessage && messageMenuPosition && createPortal(<>
      <button type="button" aria-label="Close message options" onClick={() => { setMessageMenuId(""); setMessageMenuPosition(null); }} className="fixed inset-0 z-[100] cursor-default bg-transparent" />
      <div role="group" aria-label="Message options" style={{ position: "fixed", left: messageMenuPosition.left, top: messageMenuPosition.top, width: messageMenuPosition.width }} className="z-[101] flex gap-1 rounded-2xl border border-[#ddd5f2] bg-white p-1.5 shadow-[0_5px_18px_rgba(25,26,50,0.18)]">
        <button type="button" onClick={() => startReply(menuMessage)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#514e62] transition hover:bg-[#f0ebff] hover:text-[#5947a8]"><Reply size={14}/>Reply</button>{menuMessage.from === "you" && <><button type="button" onClick={() => startEdit(menuMessage)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#514e62] transition hover:bg-[#f0ebff] hover:text-[#5947a8]"><Pencil size={14}/>Edit</button><button type="button" onClick={() => deleteChatMessage(menuMessage)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#a33b48] transition hover:bg-[#fff1f1]"><Trash2 size={14}/>Delete</button></>}
      </div>
    </>, document.body)}
    {reactionPickerMessage && reactionPickerPosition && createPortal(<>
      <button type="button" aria-label="Close reaction picker" onClick={() => { setReactionPickerId(""); setReactionPickerPosition(null); }} className="fixed inset-0 z-[100] cursor-default bg-transparent" />
      <div role="group" aria-label="Choose a reaction" style={{ position: "fixed", left: reactionPickerPosition.left, top: reactionPickerPosition.top, width: reactionPickerPosition.width }} className="z-[101] grid grid-cols-9 gap-0.5 rounded-full border border-[#ded8ee] bg-white px-2 py-1.5 shadow-[0_5px_20px_rgba(25,26,50,0.18)]">
        {QUICK_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => reactToMessage(reactionPickerMessage, emoji)} aria-label={`React ${emoji}`} className="flex h-7 min-w-0 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-[#f4f0e8]">{emoji}</button>)}
      </div>
    </>, document.body)}
  </main></div>;
}
