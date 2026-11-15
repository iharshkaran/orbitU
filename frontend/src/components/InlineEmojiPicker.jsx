import { useMemo, useState } from "react";
import { Smile } from "lucide-react";
import { EMOJI_CATEGORIES } from "../utils/emojiData";

function isFlagEmoji(emoji) {
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(emoji);
}

function flagAssetUrl(emoji) {
  const codepoints = [...emoji].map((character) => character.codePointAt(0).toString(16));
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${codepoints.join("-")}.svg`;
}

export default function InlineEmojiPicker({ onSelect, className = "" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0]?.name || "Smileys");
  const [search, setSearch] = useState("");
  const activeCategory = EMOJI_CATEGORIES.find(({ name }) => name === category) || EMOJI_CATEGORIES[0];
  const visibleEmojis = useMemo(() => {
    const query = search.trim();
    if (!query) return activeCategory?.emojis || [];
    return EMOJI_CATEGORIES.flatMap(({ emojis }) => emojis).filter((emoji) => emoji.includes(query));
  }, [activeCategory, search]);

  return <span className={`relative inline-flex shrink-0 ${className}`}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Add emoji" aria-expanded={open} title="Add emoji" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7dfd0] transition hover:bg-[#eee9ff] hover:text-[#5947a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7660dc] ${open ? "bg-[#eee9ff] text-[#5947a8]" : "bg-white text-[#777386]"}`}><Smile size={18} /></button>
    {open && <span role="dialog" aria-label="Choose an emoji" className="absolute bottom-full left-0 z-50 mb-2 block overflow-hidden rounded-2xl border border-[#191a32] bg-white shadow-[3px_4px_0_#c9bcff]" style={{ width: "min(320px, calc(100vw - 2rem))" }}>
      <span className="block border-b border-[#e7dfd0] p-2">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search emojis" aria-label="Search emojis" className="w-full rounded-lg border border-[#e7dfd0] bg-[#fffdf9] px-2.5 py-2 text-xs outline-none focus:border-[#7660dc]" />
        {!search && <span role="tablist" aria-label="Emoji categories" className="mt-2 flex gap-1 overflow-x-auto">
          {EMOJI_CATEGORIES.map(({ name, emojis }) => <button key={name} type="button" role="tab" aria-selected={category === name} onClick={() => setCategory(name)} title={name} aria-label={name} className={`shrink-0 rounded-lg px-2 py-1 text-sm transition ${category === name ? "bg-[#eee9ff] text-[#5947a8]" : "text-[#6e6a7b] hover:bg-[#f4f0e8]"}`}>{name === "Flags" ? "🏳️" : emojis[0]}</button>)}
        </span>}
      </span>
      <span className="block max-h-56 overflow-y-auto p-2">
        <span className="mb-1 block px-1 text-[10px] font-bold uppercase tracking-wide text-[#858191]">{search ? "Search results" : category}</span>
        {visibleEmojis.length ? <span className="grid grid-cols-8 gap-0.5">
          {visibleEmojis.map((emoji, index) => <button key={`${emoji}-${index}`} type="button" onClick={() => { onSelect(emoji); setOpen(false); setSearch(""); }} aria-label={`Insert ${emoji}`} title={emoji} className="flex h-9 items-center justify-center rounded-lg text-xl transition hover:bg-[#f4f0e8]">{isFlagEmoji(emoji) ? <img src={flagAssetUrl(emoji)} alt={emoji} loading="lazy" className="h-4 w-6 rounded-[2px] object-cover shadow-sm" /> : emoji}</button>)}
        </span> : <span className="block px-1 py-5 text-center text-xs text-[#858191]">No matching emoji</span>}
      </span>
    </span>}
  </span>;
}
