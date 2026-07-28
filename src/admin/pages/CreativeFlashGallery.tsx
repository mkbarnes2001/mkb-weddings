import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, GripVertical, Save, Search, Star, X } from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { CustomCollectionAssignmentOption } from "../types/customCollection";
import type { CreativeFlashGallerySettings, MomentGalleryImage, MomentRecord } from "../types/moment";

type Filter = "all" | "shown" | "hidden";
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function SafeImage({ image, className }: { image: MomentGalleryImage; className?: string }) {
  const [src, setSrc] = useState(image.thumbSrc || image.fullSrc);
  useEffect(() => setSrc(image.thumbSrc || image.fullSrc), [image.assetKey, image.thumbSrc, image.fullSrc]);
  if (!src) return <div className={className} style={{ background: "#f5f5f5" }} />;
  return <img src={src} alt={image.alt || image.filename} draggable={false} className={className} onError={() => {
    if (src !== image.fullSrc && image.fullSrc) setSrc(image.fullSrc); else setSrc("");
  }} />;
}

export function CreativeFlashGallery() {
  const [images, setImages] = useState<MomentGalleryImage[]>([]);
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const [settings, setSettings] = useState<CreativeFlashGallerySettings>({ heroImageId: "", imageOrderIds: [], hiddenImageIds: [] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customCollections, setCustomCollections] = useState<CustomCollectionAssignmentOption[]>([]);
  const [customMemberships, setCustomMemberships] = useState<Record<string, string[]>>({});
  const [customMembershipDirty, setCustomMembershipDirty] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([AdminApiService.getCreativeFlashGallery(), AdminApiService.getMoments(), AdminApiService.getCustomCollectionMemberships()])
      .then(([gallery, momentDoc, collectionData]) => {
        setImages(gallery.images); setSettings(gallery.settings); setMoments(momentDoc.moments.filter((m) => m.status === "active" && m.availableForAssignment));
        setCustomCollections(collectionData.collections); setCustomMemberships(collectionData.memberships);
        setActive(gallery.images[0]?.assetKey || null);
      }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load Creative Flash gallery."));
  }, []);

  const imageMap = useMemo(() => new Map(images.map((i) => [i.assetKey, i])), [images]);
  const hidden = useMemo(() => new Set(settings.hiddenImageIds || []), [settings.hiddenImageIds]);
  const order = useMemo(() => {
    const all = images.map((i) => i.assetKey), available = new Set(all);
    return unique([...(settings.imageOrderIds || []), ...all]).filter((id) => available.has(id));
  }, [images, settings.imageOrderIds]);
  const ordered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return order.map((id) => imageMap.get(id)).filter((x): x is MomentGalleryImage => Boolean(x)).filter((i) => {
      const h = hidden.has(i.assetKey); if (filter === "shown" && h) return false; if (filter === "hidden" && !h) return false;
      return !q || [i.venueName, i.weddingSlug, i.filename, i.alt].join(" ").toLowerCase().includes(q);
    });
  }, [order, imageMap, hidden, filter, search]);
  const activeImage = active ? imageMap.get(active) || null : null;

  const patchSettings = (patch: Partial<CreativeFlashGallerySettings>) => { setSettings((s) => ({ ...s, ...patch })); setDirty(true); setMessage(""); };
  const patchImage = (key: string, patch: Partial<MomentGalleryImage>) => { setImages((list) => list.map((i) => i.assetKey === key ? { ...i, ...patch } : i)); setDirty(true); };
  const toggleMoment = (image: MomentGalleryImage, slug: string, checked: boolean) => {
    const next = checked ? unique([...image.moments, slug]) : image.moments.filter((m) => m !== slug);
    patchImage(image.assetKey, { moments: next, display: { ...image.display, moments: next.length > 0 } });
  };
  const setCustomCollection = (assetKey: string, collectionId: string, checked: boolean) => {
    setCustomMemberships((current) => {
      const next = new Set(current[assetKey] || []);
      checked ? next.add(collectionId) : next.delete(collectionId);
      return { ...current, [assetKey]: [...next] };
    });
    setCustomMembershipDirty((current) => new Set(current).add(assetKey));
    setDirty(true); setMessage(""); setError("");
  };
  const hideKeys = (keys: string[]) => patchSettings({ hiddenImageIds: unique([...settings.hiddenImageIds, ...keys]) });
  const showKeys = (keys: string[]) => { const remove = new Set(keys); patchSettings({ hiddenImageIds: settings.hiddenImageIds.filter((id) => !remove.has(id)) }); };

  function beginDrag(image: MomentGalleryImage) {
    const moving = selected.has(image.assetKey) && selected.size > 1 ? order.filter((id) => selected.has(id)) : [image.assetKey];
    if (!selected.has(image.assetKey)) setSelected(new Set([image.assetKey])); setActive(image.assetKey); setDragged(moving);
  }
  function dropOn(target: string) {
    if (!dragged.length || dragged.includes(target)) { setDragged([]); return; }
    const movingSet = new Set(dragged), moving = order.filter((id) => movingSet.has(id)), rest = order.filter((id) => !movingSet.has(id));
    const idx = rest.indexOf(target); const next = [...rest]; idx < 0 ? next.push(...moving) : next.splice(idx, 0, ...moving);
    patchSettings({ imageOrderIds: next }); setDragged([]);
  }
  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const valid = new Set(images.map((i) => i.assetKey));
      const clean = { heroImageId: settings.heroImageId, imageOrderIds: order.filter((id) => valid.has(id)), hiddenImageIds: unique(settings.hiddenImageIds).filter((id) => valid.has(id)) };
      await AdminApiService.saveCreativeFlashGallery({ settings: clean, updates: images.map((i) => ({ assetKey: i.assetKey, included: i.included, moments: i.moments, display: i.display })) });
      if (customMembershipDirty.size) {
        await AdminApiService.saveCustomCollectionMemberships([...customMembershipDirty].map((assetKey) => ({ assetKey, collectionIds: customMemberships[assetKey] || [] })));
      }
      setSettings(clean); setCustomMembershipDirty(new Set()); setDirty(false); setSelected(new Set()); setMessage("Creative Flash gallery saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save Creative Flash gallery."); } finally { setSaving(false); }
  }

  const shownCount = images.length - hidden.size;
  return <div className="space-y-6">
    <section className="rounded-[30px] bg-black p-7 text-white md:p-9">
      <Link to="/admin/gallery" className="mb-4 inline-flex items-center gap-2 text-sm text-white/60"><ArrowLeft className="h-4 w-4"/>Back to collections</Link>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/45">Gallery Manager</p><h1 className="font-serif text-4xl md:text-5xl">Creative Flash</h1><p className="mt-3 text-sm text-white/60">Reorder, hide, classify and choose the Creative Flash hero using the same workflow as Moments.</p></div>
        <div className="flex gap-3"><a href="https://www.mkbweddings.co.uk/gallery/creative-flash" target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-5 py-3 text-sm">View live gallery</a><button onClick={save} disabled={saving || !dirty} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"><Save className="h-4 w-4"/>{saving ? "Saving…" : dirty ? "Save gallery" : "Saved"}</button></div>
      </div>
      <div className="mt-7 grid grid-cols-3 gap-3"><Stat label="Assigned" value={images.length}/><Stat label="Shown" value={shownCount}/><Stat label="Hidden" value={hidden.size}/></div>
    </section>
    {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div>}{error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>}
    <section className="rounded-[24px] border border-black/10 bg-white/85 p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative flex-1 xl:max-w-xl"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search venue, wedding or filename…" className="w-full rounded-full border border-black/10 py-2.5 pl-11 pr-4 text-sm"/></div><div className="flex gap-2">{([['all',`All ${images.length}`],['shown',`Shown ${shownCount}`],['hidden',`Hidden ${hidden.size}`]] as const).map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`rounded-full px-4 py-2 text-sm ${filter===v?'bg-black text-white':'border border-black/10 bg-white'}`}>{l}</button>)}</div></div>
      {selected.size>0 && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-neutral-100 p-3"><strong className="text-sm">{selected.size} selected</strong><button onClick={()=>showKeys([...selected])} className="rounded-full border bg-white px-4 py-2 text-sm">Show</button><button onClick={()=>hideKeys([...selected])} className="rounded-full border bg-white px-4 py-2 text-sm">Hide</button><span className="text-xs text-neutral-500">Drag the grip on any selected image to move the selection together.</span><button onClick={()=>setSelected(new Set())} className="ml-auto rounded-full border bg-white p-2"><X className="h-4 w-4"/></button></div>}
    </section>
    <section className="admin-master-detail admin-master-detail--320">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(120px,1fr))",gap:"12px",alignItems:"start"}}>{ordered.map((image,index)=>{const sel=selected.has(image.assetKey), hid=hidden.has(image.assetKey), hero=settings.heroImageId===image.assetKey||settings.heroImageId===image.imageId; return <article key={image.assetKey} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();dropOn(image.assetKey)}} style={{overflow:"hidden",borderRadius:16,border:active===image.assetKey?'2px solid #111':sel?'2px solid #737373':'1px solid rgba(0,0,0,.12)',background:'#fff',opacity:dragged.includes(image.assetKey)?.4:hid?.55:1}}>
        <div onClick={(e)=>{setActive(image.assetKey); if(e.shiftKey&&anchor.current!==null){const a=Math.min(anchor.current,index),b=Math.max(anchor.current,index);setSelected(new Set(ordered.slice(a,b+1).map(i=>i.assetKey)))} else if(e.metaKey||e.ctrlKey){setSelected(s=>{const n=new Set(s);n.has(image.assetKey)?n.delete(image.assetKey):n.add(image.assetKey);return n})} anchor.current=index}} style={{position:'relative',aspectRatio:'4 / 5',overflow:'hidden',cursor:'pointer',background:'#f5f5f5'}}><SafeImage image={image} className="h-full w-full object-cover"/><button onClick={(e)=>{e.stopPropagation();setSelected(s=>{const n=new Set(s);n.has(image.assetKey)?n.delete(image.assetKey):n.add(image.assetKey);return n})}} style={{position:'absolute',right:8,top:8,zIndex:30,width:30,height:30,borderRadius:999,background:sel?'#111':'#fff',color:sel?'#fff':'transparent',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(0,0,0,.15)'}}><Check size={16}/></button><div draggable onDragStart={(e)=>{e.dataTransfer.effectAllowed='move';beginDrag(image)}} onDragEnd={()=>setDragged([])} style={{position:'absolute',right:8,bottom:8,zIndex:30,width:38,height:38,borderRadius:999,background:'#fff',boxShadow:'0 6px 18px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'grab'}}><GripVertical size={20}/></div>{hero&&<span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-[9px] text-white">Hero</span>}</div><div className="p-2.5"><p className="truncate text-[11px] font-medium">{image.venueName||'Unlinked venue'}</p></div></article>})}</div>
      <aside className="admin-summary-panel" style={{borderRadius:24,border:'1px solid rgba(0,0,0,.12)',background:'#fff',padding:16}}>{!activeImage?<p className="text-sm text-neutral-500">Select an image to edit its gallery settings.</p>:<div className="space-y-4"><SafeImage image={activeImage} className="max-h-[240px] w-full rounded-2xl object-contain bg-neutral-100"/><div><p className="break-all text-xs text-neutral-500">{activeImage.filename}</p><p className="mt-1 text-sm font-medium">{activeImage.venueName}</p></div>
        <button onClick={()=>hidden.has(activeImage.assetKey)?showKeys([activeImage.assetKey]):hideKeys([activeImage.assetKey])} className="flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm">{hidden.has(activeImage.assetKey)?<Eye className="h-4 w-4"/>:<EyeOff className="h-4 w-4"/>}{hidden.has(activeImage.assetKey)?'Show in gallery':'Hide from gallery'}</button>
        <button onClick={()=>{showKeys([activeImage.assetKey]);patchSettings({heroImageId:activeImage.assetKey})}} className="flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm"><Star className="h-4 w-4"/>{settings.heroImageId===activeImage.assetKey?'Hero image set':'Set as Creative Flash hero'}</button>
        <button onClick={async()=>{try{await AdminApiService.setGalleryMasterHero("landing",activeImage.assetKey);setMessage("Main Gallery landing-page hero updated.")}catch(heroError){setError(heroError instanceof Error?heroError.message:"Unable to set main Gallery landing-page hero.")}}} className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm text-white"><Star className="h-4 w-4"/>Set as main Gallery landing hero</button>
        <div className="border-t pt-4"><p className="mb-3 text-xs uppercase tracking-[.14em] text-neutral-500">Gallery destinations</p><CheckRow label="Venue gallery" checked={activeImage.included} onChange={(v)=>patchImage(activeImage.assetKey,{included:v,display:{...activeImage.display,venue:v}})}/><CheckRow label="Creative Flash" checked={activeImage.display.creativeFlash} onChange={(v)=>patchImage(activeImage.assetKey,{display:{...activeImage.display,creativeFlash:v}})}/><CheckRow label="Wedding story" checked={activeImage.display.blog} onChange={(v)=>patchImage(activeImage.assetKey,{display:{...activeImage.display,blog:v}})}/><CheckRow label="Homepage" checked={activeImage.display.homepage} onChange={(v)=>patchImage(activeImage.assetKey,{display:{...activeImage.display,homepage:v}})}/><CheckRow label="Portfolio" checked={activeImage.display.portfolio} onChange={(v)=>patchImage(activeImage.assetKey,{display:{...activeImage.display,portfolio:v}})}/></div>
        <div className="border-t pt-4"><p className="mb-3 text-xs uppercase tracking-[.14em] text-neutral-500">Moments</p>{moments.map((m)=><CheckRow key={m.id} label={m.name} checked={activeImage.moments.includes(m.slug)} onChange={(v)=>toggleMoment(activeImage,m.slug,v)}/>)}</div>
        <div className="border-t pt-4"><p className="mb-3 text-xs uppercase tracking-[.14em] text-neutral-500">Custom collections</p>{customCollections.length ? customCollections.map((collection)=><CheckRow key={collection.id} label={`${collection.name}${collection.status === "draft" ? " (Draft)" : ""}`} checked={(customMemberships[activeImage.assetKey] || []).includes(collection.id)} onChange={(v)=>setCustomCollection(activeImage.assetKey, collection.id, v)}/>) : <p className="text-xs leading-5 text-neutral-500">No custom collections yet. Create one from Collections.</p>}</div>
      </div>}</aside>
    </section>
  </div>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="rounded-2xl border border-white/10 bg-white/[.05] p-3"><p className="text-xs uppercase tracking-[.14em] text-white/45">{label}</p><p className="mt-1 text-xl">{value}</p></div>}
function CheckRow({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-black/10 p-3"><span className="text-sm">{label}</span><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)}/></label>}
