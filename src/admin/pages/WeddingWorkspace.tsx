import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  ImagePlus,
  Instagram,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import type { WeddingDocument } from "../../lib/weddingEngine";
import { AdminApiService } from "../services/AdminApiService";
import { SupplierService, type MasterSupplier, type SupplierRecord } from "../services/SupplierService";
import { uploadPrivateOriginal } from "../lib/privateOriginalUpload";
import type { VenueSummary } from "../types/venue";
import type { WeddingWorkspacePayload } from "../types/weddingWorkspace";

const PUBLIC_ORIGIN = "https://www.mkbweddings.co.uk";

type UploadItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  stage: string;
  error: string;
};

function cleanInstagram(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutUrl = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\?.*$/, "");
  const handle = withoutUrl.replace(/^@/, "").replace(/\/+$/, "").split("/")[0].trim();
  return handle ? `@${handle}` : "";
}

function displayDate(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function publicGalleryUrl(token: string) {
  return `${PUBLIC_ORIGIN}/client-gallery/${token}`;
}

export function WeddingWorkspace() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [workspace, setWorkspace] = useState<WeddingWorkspacePayload | null>(null);
  const [wedding, setWedding] = useState<WeddingDocument | null>(null);
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [masterSuppliers, setMasterSuppliers] = useState<MasterSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierRole, setSupplierRole] = useState("");
  const [previewIds, setPreviewIds] = useState<string[]>([]);
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [addToVenue, setAddToVenue] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = async () => {
    setError("");
    try {
      const [nextWorkspace, nextWedding, nextVenues, supplierService] = await Promise.all([
        AdminApiService.getWeddingWorkspace(slug),
        AdminApiService.getJsonWedding(slug),
        AdminApiService.listVenues(),
        SupplierService.load(),
      ]);
      setWorkspace(nextWorkspace);
      setWedding(nextWedding);
      setVenues(nextVenues.filter((venue) => venue.status !== "archived"));
      setMasterSuppliers(supplierService.getMasterSuppliers().filter((supplier) => supplier.status !== "archived"));
      setSuppliers(supplierService.getSuppliersForWedding(slug));
      setPreviewIds(nextWorkspace.previewSet.assetIds);
      setCaption(buildCaption(nextWorkspace, supplierService.getSuppliersForWedding(slug)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wedding workspace.");
    }
  };

  useEffect(() => {
    if (slug) reload();
  }, [slug]);

  const clientGallery = workspace?.clientGalleries[0] || null;
  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.slug === wedding?.venueSlug) || null,
    [venues, wedding?.venueSlug],
  );
  const selectedSupplier = useMemo(
    () => masterSuppliers.find((supplier) => supplier.id === selectedSupplierId) || null,
    [masterSuppliers, selectedSupplierId],
  );
  const previewAssets = useMemo(
    () => (workspace?.assets || []).filter((asset) => previewIds.includes(asset.id)),
    [workspace?.assets, previewIds],
  );
  const queuedCount = uploads.filter((item) => item.status === "queued").length;

  function buildCaption(data: WeddingWorkspacePayload, rows: SupplierRecord[]) {
    const lines: string[] = [];
    const couple = data.wedding.couple || data.wedding.title;
    const venueName = data.wedding.venue || data.venue?.name;
    lines.push(`A few previews from ${couple}${venueName ? `’s wedding at ${venueName}` : "’s wedding"}.`);
    lines.push("");
    lines.push("What a brilliant day with an amazing team of suppliers.");
    lines.push("");

    const venueHandle = cleanInstagram(data.venue?.instagram || "");
    if (venueName) lines.push(`Venue: ${venueHandle || venueName}`);
    const studioHandle = cleanInstagram(data.workspace.instagram || "");
    if (studioHandle) lines.push(`Photography: ${studioHandle}`);

    const seen = new Set<string>();
    rows.forEach((row) => {
      const role = String(row.role || "Supplier").trim();
      const name = String(row.name || "").trim();
      const handle = cleanInstagram(String(row.instagram || ""));
      const key = `${role.toLowerCase()}|${name.toLowerCase()}|${handle.toLowerCase()}`;
      if (!name || seen.has(key)) return;
      if (role.toLowerCase() === "venue" && venueName && name.toLowerCase() === venueName.toLowerCase()) return;
      if (role.toLowerCase() === "photography" && studioHandle) return;
      seen.add(key);
      lines.push(`${role}: ${handle || name}`);
    });

    lines.push("");
    lines.push("#WeddingPhotography #WeddingPreviews");
    return lines.join("\n");
  }

  const regenerateCaption = () => {
    if (workspace) setCaption(buildCaption(workspace, suppliers));
  };

  const saveVenue = async (venueSlug: string) => {
    if (!wedding) return;
    const venue = venues.find((item) => item.slug === venueSlug);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated: WeddingDocument = {
        ...wedding,
        venueSlug: venue?.slug || "",
        venueId: venue?.id || "",
        venue: venue?.name || "",
      };
      const result = await AdminApiService.updateJsonWedding(slug, updated);
      setWedding(result.wedding);
      setMessage(venue ? `${venue.name} linked to this wedding.` : "Venue link cleared.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update venue.");
    } finally {
      setBusy(false);
    }
  };

  async function saveSupplierRows(nextRows: SupplierRecord[], success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const normalized = nextRows.map((row, index) => ({ ...row, blogSlug: slug, sortOrder: String(index + 1) }));
      await AdminApiService.saveWeddingSuppliers(slug, normalized);
      setSuppliers(normalized);
      setMessage(success);
      if (workspace) setCaption(buildCaption(workspace, normalized));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update suppliers.");
    } finally {
      setBusy(false);
    }
  }

  const addSupplier = async () => {
    if (!selectedSupplier) return;
    const role = supplierRole.trim() || selectedSupplier.category || "Supplier";
    if (suppliers.some((row) => row.supplierId === selectedSupplier.id && String(row.role || "").toLowerCase() === role.toLowerCase())) {
      setError(`${selectedSupplier.name} is already assigned as ${role}.`);
      return;
    }
    await saveSupplierRows([
      ...suppliers,
      {
        supplierId: selectedSupplier.id,
        role,
        name: selectedSupplier.name,
        website: selectedSupplier.website,
        instagram: selectedSupplier.instagram,
        email: selectedSupplier.email,
        phone: selectedSupplier.phone,
        location: selectedSupplier.location,
        county: selectedSupplier.county,
      },
    ], `${selectedSupplier.name} added.`);
    setSelectedSupplierId("");
    setSupplierRole("");
  };

  const removeSupplier = async (index: number) => {
    const row = suppliers[index];
    await saveSupplierRows(suppliers.filter((_, itemIndex) => itemIndex !== index), `${row?.name || "Supplier"} removed.`);
  };

  const createGallery = async () => {
    if (!workspace) return;
    setBusy(true);
    setError("");
    try {
      const gallery = await AdminApiService.createClientGallery({
        title: workspace.wedding.couple || workspace.wedding.title,
        weddingSlug: slug,
        clientName: workspace.wedding.couple,
        status: "draft",
        allowFavourites: true,
        allowDownloads: false,
        importWeddingAssets: false,
      });
      setMessage("Client gallery created. You can upload previews here immediately.");
      await reload();
      window.setTimeout(() => {
        const element = document.getElementById("preview-upload");
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return gallery;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create client gallery.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addOriginalFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: file.type === "image/jpeg" ? "queued" as const : "error" as const,
      progress: 0,
      stage: file.type === "image/jpeg" ? "Ready" : "Unsupported file",
      error: file.type === "image/jpeg" ? "" : "Only full-resolution JPEG files are supported.",
    }));
    setUploads((current) => [...current, ...next]);
  };

  const updateUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const uploadQueued = async () => {
    if (!clientGallery) return;
    const pending = uploads.filter((item) => item.status === "queued");
    if (!pending.length) return;
    setUploading(true);
    setError("");
    setMessage("");
    const completedIds: string[] = [];
    let failed = 0;
    for (const item of pending) {
      updateUpload(item.id, { status: "uploading", progress: 1, stage: "Starting", error: "" });
      try {
        const session = await uploadPrivateOriginal({
          galleryId: clientGallery.id,
          file: item.file,
          onProgress: (progress, stage) => updateUpload(item.id, { progress, stage }),
        });
        completedIds.push(session.assetId);
        updateUpload(item.id, { status: "done", progress: 100, stage: "Complete", error: "" });
      } catch (err) {
        failed += 1;
        updateUpload(item.id, { status: "error", progress: 0, stage: "Upload failed", error: err instanceof Error ? err.message : "Upload failed." });
      }
    }
    try {
      if (completedIds.length) {
        const merged = Array.from(new Set([...previewIds, ...completedIds]));
        const next = await AdminApiService.saveWeddingPreviewSet(slug, merged);
        setWorkspace(next);
        setPreviewIds(next.previewSet.assetIds);
      } else {
        await reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Images uploaded but preview set could not be updated.");
    } finally {
      setUploading(false);
    }
    if (failed) setError(`${completedIds.length} previews uploaded; ${failed} failed and can be retried.`);
    else setMessage(`${completedIds.length} full-resolution preview${completedIds.length === 1 ? "" : "s"} uploaded and added to the Preview Set.`);
  };

  const savePreviewSet = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await AdminApiService.saveWeddingPreviewSet(slug, previewIds);
      setWorkspace(next);
      setPreviewIds(next.previewSet.assetIds);
      setMessage(`Preview Set saved with ${next.previewSet.assetIds.length} image${next.previewSet.assetIds.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save Preview Set.");
    } finally {
      setBusy(false);
    }
  };

  const publishAssignments = async () => {
    if (!workspace) return;
    if (!previewIds.length) {
      setError("Add at least one image to the Preview Set first.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await AdminApiService.publishWeddingPreviewAssignments(slug, {
        assetIds: previewIds,
        addToVenue,
        venueSlug: workspace.wedding.venueSlug,
        momentIds: selectedMomentIds,
        galleryIds: selectedGalleryIds,
      });
      const destinations = [
        result.venue?.name,
        ...result.moments.map((moment) => moment.name),
        ...result.galleries.map((gallery) => gallery.name),
      ].filter(Boolean);
      setMessage(`${result.published} preview image${result.published === 1 ? "" : "s"} added${destinations.length ? ` to ${destinations.join(", ")}` : " to public publishing records"}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish preview assignments.");
    } finally {
      setBusy(false);
    }
  };

  if (!workspace || !wedding) {
    return <div className="p-8 text-neutral-500">{error || "Loading Wedding Workspace…"}</div>;
  }

  const setupSteps = [
    { label: "Wedding created", done: true },
    { label: "Venue linked", done: Boolean(workspace.wedding.venueSlug) },
    { label: `${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"} linked`, done: suppliers.length > 0 },
    { label: "Client gallery created", done: Boolean(clientGallery) },
    { label: `${previewIds.length} preview${previewIds.length === 1 ? "" : "s"} selected`, done: previewIds.length > 0 },
  ];

  return (
    <div className="space-y-7" style={{ maxWidth: 1680 }}>
      <Link to="/admin/weddings" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> Weddings
      </Link>

      <section className="rounded-[30px] bg-black p-8 text-white md:p-10">
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Post-wedding workspace</p>
        <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl" style={{ fontWeight: 600, letterSpacing: "-.03em" }}>{workspace.wedding.couple || workspace.wedding.title}</h1>
            <p className="mt-3 text-white/60">{workspace.wedding.venue || "Venue not linked"}{workspace.wedding.weddingDate ? ` · ${displayDate(workspace.wedding.weddingDate)}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/weddings/${slug}/content`} className="rounded-full border border-white/20 px-5 py-3 text-sm">Master content</Link>
            <Link to={`/admin/weddings/${slug}/publish`} className="rounded-full border border-white/20 px-5 py-3 text-sm">Publishing</Link>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2">
          {setupSteps.map((step) => (
            <span key={step.label} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs ${step.done ? "bg-white text-black" : "border border-white/20 text-white/60"}`}>
              {step.done ? <Check className="h-3.5 w-3.5" /> : null}{step.label}
            </span>
          ))}
        </div>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(320px,420px)", gap: 24, alignItems: "start" }}>
        <main className="space-y-7">
          <section className="rounded-[26px] border border-black/10 bg-white p-6">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div><p className="text-xs uppercase tracking-[0.18em] text-neutral-500">1 · Wedding setup</p><h2 className="mt-2 text-2xl" style={{ fontWeight: 600 }}>Venue & suppliers</h2></div>
              <Link to={`/admin/weddings/${slug}/content`} className="text-sm underline underline-offset-4">Edit full wedding record</Link>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.14em] text-neutral-500">Venue</label>
                <select value={wedding.venueSlug || ""} disabled={busy} onChange={(event) => saveVenue(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3">
                  <option value="">Select venue…</option>
                  {venues.map((venue) => <option key={venue.slug} value={venue.slug}>{venue.name}</option>)}
                </select>
                {selectedVenue ? <p className="mt-2 text-xs text-neutral-500">{selectedVenue.town}{selectedVenue.county ? ` · ${selectedVenue.county}` : ""}</p> : null}
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.14em] text-neutral-500">Add supplier</label>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_150px_auto] gap-2">
                  <select value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)} className="min-w-0 rounded-xl border border-black/15 bg-white px-3 py-3">
                    <option value="">Select supplier…</option>
                    {masterSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.displayName || supplier.name}</option>)}
                  </select>
                  <input value={supplierRole} onChange={(event) => setSupplierRole(event.target.value)} placeholder={selectedSupplier?.category || "Role"} className="rounded-xl border border-black/15 px-3 py-3" />
                  <button disabled={!selectedSupplier || busy} onClick={addSupplier} className="rounded-xl bg-black px-4 text-white disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {suppliers.map((row, index) => (
                <span key={`${row.supplierId}-${row.role}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-3 py-2 text-sm">
                  <span className="text-neutral-500">{row.role}</span><strong className="font-medium">{row.name}</strong>{row.instagram ? <span className="text-neutral-400">{cleanInstagram(row.instagram)}</span> : null}
                  <button title="Remove" disabled={busy} onClick={() => removeSupplier(index)}><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
              {!suppliers.length ? <p className="text-sm text-neutral-500">No suppliers linked yet.</p> : null}
            </div>
          </section>

          <section id="preview-upload" className="rounded-[26px] border border-black/10 bg-white p-6">
            <div className="flex items-start justify-between gap-5 flex-wrap">
              <div><p className="text-xs uppercase tracking-[0.18em] text-neutral-500">2 · Client delivery</p><h2 className="mt-2 text-2xl" style={{ fontWeight: 600 }}>Client gallery & previews</h2><p className="mt-2 text-sm text-neutral-600">Upload full-resolution preview JPEGs once. They become private client originals plus safe web derivatives for publishing.</p></div>
              {clientGallery ? <Link to={`/admin/client-galleries/${clientGallery.id}`} className="rounded-full border border-black/15 px-5 py-3 text-sm">Open full gallery manager</Link> : <button disabled={busy} onClick={createGallery} className="rounded-full bg-black px-5 py-3 text-sm text-white"><Plus className="mr-2 inline h-4 w-4" />Create client gallery</button>}
            </div>

            {clientGallery ? (
              <>
                <div className="mt-5 rounded-2xl bg-neutral-50 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div><strong>{clientGallery.title}</strong><p className="mt-1 text-xs text-neutral-500">{clientGallery.status} · {clientGallery.clientEmail || "Client email not set"}</p></div>
                  <div className="flex gap-2">
                    {clientGallery.status === "live" ? <a href={publicGalleryUrl(clientGallery.accessToken)} target="_blank" rel="noreferrer" className="rounded-full border border-black/15 px-4 py-2 text-sm inline-flex items-center gap-2"><ExternalLink className="h-4 w-4" />Open private link</a> : null}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
                  <label className="rounded-full bg-black text-white px-5 py-3 inline-flex items-center gap-2 cursor-pointer"><UploadCloud className="h-4 w-4" />Choose full-res JPEGs<input type="file" multiple accept="image/jpeg,.jpg,.jpeg" onChange={(event) => { addOriginalFiles(event.target.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
                  <p className="text-xs text-neutral-500">Uploads are added automatically to the Wedding Day Preview Set.</p>
                </div>
                {uploads.length ? <div className="mt-4 space-y-2">{uploads.map((item) => <div key={item.id} className="rounded-2xl border border-black/10 bg-neutral-50 p-3 grid grid-cols-[minmax(0,1fr)_70px_36px] gap-3 items-center"><div className="min-w-0"><div className="flex items-center gap-2">{item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : item.status === "error" ? <X className="h-4 w-4 text-red-700" /> : item.status === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 text-neutral-400" />}<span className="truncate text-sm">{item.file.name}</span></div><div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-black" style={{ width: `${item.progress}%` }} /></div><p className="mt-1 text-xs text-neutral-500">{item.error || item.stage}</p></div><span className="text-xs text-right">{item.progress}%</span>{item.status === "error" ? <button onClick={() => updateUpload(item.id, { status: "queued", progress: 0, stage: "Ready", error: "" })}><RefreshCw className="h-4 w-4" /></button> : <button disabled={uploading || item.status === "uploading"} onClick={() => setUploads((current) => current.filter((upload) => upload.id !== item.id))}><Trash2 className="h-4 w-4" /></button>}</div>)}</div> : null}
                {uploads.length ? <div className="mt-4 flex justify-end"><button disabled={uploading || !queuedCount} onClick={uploadQueued} className="rounded-full bg-black text-white px-6 py-3 disabled:opacity-40">{uploading ? "Uploading…" : `Upload ${queuedCount || ""} preview${queuedCount === 1 ? "" : "s"}`}</button></div> : null}
              </>
            ) : <p className="mt-5 text-sm text-neutral-500">Create the linked client gallery first, then upload previews directly from this page.</p>}
          </section>

          <section className="rounded-[26px] border border-black/10 bg-white p-6">
            <div className="flex items-start justify-between gap-5 flex-wrap"><div><p className="text-xs uppercase tracking-[0.18em] text-neutral-500">3 · Preview Set</p><h2 className="mt-2 text-2xl" style={{ fontWeight: 600 }}>Wedding Day Previews</h2><p className="mt-2 text-sm text-neutral-600">Choose the images you want to use across venue galleries, moments, custom galleries and social posts.</p></div><div className="flex gap-2"><button onClick={() => setPreviewIds(workspace.assets.map((asset) => asset.id))} className="rounded-full border border-black/15 px-4 py-2 text-sm">Select all</button><button disabled={busy} onClick={savePreviewSet} className="rounded-full bg-black text-white px-4 py-2 text-sm inline-flex items-center gap-2"><Save className="h-4 w-4" />Save Preview Set</button></div></div>
            <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10 }}>
              {workspace.assets.map((asset) => { const selected = previewIds.includes(asset.id); return <button key={asset.id} onClick={() => setPreviewIds((current) => selected ? current.filter((id) => id !== asset.id) : [...current, asset.id])} className={`relative overflow-hidden rounded-2xl border text-left ${selected ? "border-black ring-2 ring-black/10" : "border-black/10"}`}><img src={asset.thumbSrc || asset.webSrc} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} /><span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow">{selected ? <Check className="h-4 w-4" /> : null}</span>{asset.hasOriginal ? <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-1 text-[9px] uppercase text-white">Original</span> : null}<span className="block truncate p-2 text-[11px]">{asset.filename}</span></button>; })}
            </div>
            {!workspace.assets.length ? <p className="mt-5 text-sm text-neutral-500">No canonical assets linked to this wedding yet.</p> : null}
          </section>

          <section className="rounded-[26px] border border-black/10 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">4 · Publishing destinations</p><h2 className="mt-2 text-2xl" style={{ fontWeight: 600 }}>Use previews across the Intelligence platform</h2><p className="mt-2 text-sm text-neutral-600">This only adds safe web derivatives to public destinations. Private full-resolution originals remain protected.</p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div><p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Venue</p><label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={addToVenue} disabled={!workspace.wedding.venueSlug} onChange={(event) => setAddToVenue(event.target.checked)} /><span>{workspace.wedding.venue || "No venue linked"}</span></label></div>
              <div><p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Moments</p><div className="mt-3 space-y-2 max-h-44 overflow-auto">{workspace.moments.map((moment) => <label key={moment.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selectedMomentIds.includes(moment.id)} onChange={(event) => setSelectedMomentIds((current) => event.target.checked ? [...current, moment.id] : current.filter((id) => id !== moment.id))} />{moment.name}</label>)}</div></div>
              <div><p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Galleries</p><div className="mt-3 space-y-2 max-h-44 overflow-auto">{workspace.galleries.map((gallery) => <label key={gallery.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selectedGalleryIds.includes(gallery.id)} onChange={(event) => setSelectedGalleryIds((current) => event.target.checked ? [...current, gallery.id] : current.filter((id) => id !== gallery.id))} />{gallery.name}</label>)}</div></div>
            </div>
            <button disabled={busy || !previewIds.length} onClick={publishAssignments} className="mt-6 rounded-full bg-black text-white px-6 py-3 inline-flex items-center gap-2 disabled:opacity-40"><Send className="h-4 w-4" />Add {previewIds.length || ""} previews to selected destinations</button>
          </section>
        </main>

        <aside className="space-y-7" style={{ position: "sticky", top: 96 }}>
          <section className="rounded-[26px] border border-black/10 bg-white p-6">
            <div className="flex items-center gap-3"><Instagram className="h-5 w-5" /><div><p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Social</p><h2 className="text-xl" style={{ fontWeight: 600 }}>Instagram preview post</h2></div></div>
            <p className="mt-3 text-sm text-neutral-600">Generated from the wedding, venue and reusable supplier records. Edit freely before copying.</p>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={18} className="mt-4 w-full rounded-2xl border border-black/15 p-4 text-sm leading-relaxed" />
            <div className="mt-3 flex gap-2"><button onClick={regenerateCaption} className="rounded-full border border-black/15 px-4 py-2 text-sm">Regenerate</button><button onClick={async () => { await navigator.clipboard?.writeText(caption); setMessage("Instagram caption copied."); }} className="rounded-full bg-black text-white px-4 py-2 text-sm inline-flex items-center gap-2"><Clipboard className="h-4 w-4" />Copy caption</button></div>
          </section>

          <section className="rounded-[26px] border border-black/10 bg-white p-6">
            <div className="flex items-center gap-3"><Users className="h-5 w-5" /><h2 className="text-xl" style={{ fontWeight: 600 }}>At a glance</h2></div>
            <div className="mt-4 space-y-3 text-sm"><Row label="Venue" value={workspace.wedding.venue || "Not linked"} /><Row label="Suppliers" value={String(suppliers.length)} /><Row label="Client gallery" value={clientGallery?.status || "Not created"} /><Row label="Wedding assets" value={String(workspace.assets.length)} /><Row label="Preview Set" value={String(previewAssets.length)} /><Row label="Full-res previews" value={String(previewAssets.filter((asset) => asset.hasOriginal).length)} /></div>
            {clientGallery ? <Link to={`/admin/client-galleries/${clientGallery.id}`} className="mt-5 block rounded-full border border-black/15 px-4 py-3 text-center text-sm">Manage client gallery</Link> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3"><span className="text-neutral-500">{label}</span><strong className="text-right font-medium">{value}</strong></div>;
}
