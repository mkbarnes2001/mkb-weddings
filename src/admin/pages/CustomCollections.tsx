import { AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowRight, Images, Plus, Save, Zap } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminApiService } from "../services/AdminApiService";
import type { CustomCollection } from "../types/customCollection";
import { AdminPageHeader, AdminPanel, AdminField, AdminButton, AdminEmptyState } from "../components/ui/AdminUI";

import { StudioBackLink, StudioThumbnail, StudioToggle } from "../components/ui/StudioUI";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CustomCollections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [routeSlugs, setRouteSlugs] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  const showCreate = searchParams.get("new") === "gallery";
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingSlug, setSavingSlug] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setShowCreate(open: boolean) {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("new", "gallery");
    else next.delete("new");
    setSearchParams(next, {replace: true});
  }

  async function load() {
    try {
      setError("");
      const loaded = await AdminApiService.listCustomCollections();
      setCollections(loaded);
      setRouteSlugs(Object.fromEntries(loaded.map((collection) => [collection.id, collection.slug])));
      setLoading(false);
    } catch (loadError) {
      setLoading(false);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load galleries.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(
    () => [...collections].sort((a, b) => a.sortOrder - b.sortOrder),
    [collections],
  );

  function patch(id: string, changes: Partial<CustomCollection>) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === id ? { ...collection, ...changes } : collection,
      ),
    );
    setMessage("");
    setError("");
  }

  async function createCollection() {
    const name = newName.trim();
    if (!name || creating || loading) return;
    setCreating(true);
    setMessage("");
    setError("");
    try {
      const collection = await AdminApiService.createCustomCollection({
        name,
        slug: slugify(name),
        description: "",
        status: "draft",
        showOnLanding: false,
      });
      setCollections((current) => [...current, collection]);
      setRouteSlugs((current) => ({ ...current, [collection.id]: collection.slug }));
      setSelectedId(collection.id);
      setShowCreate(false);
      setNewName("");
      setMessage(`${collection.name} created. Add images before making it public.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create gallery.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function saveCollection(collection: CustomCollection) {
    const routeSlug = routeSlugs[collection.id] || collection.slug;
    setSavingSlug(collection.id);
    setMessage("");
    setError("");
    try {
      const saved = await AdminApiService.updateCustomCollection(routeSlug, collection);
      setCollections((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setRouteSlugs((current) => ({ ...current, [saved.id]: saved.slug }));
      setMessage(`${saved.name} saved.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save gallery.",
      );
    } finally {
      setSavingSlug("");
    }
  }

  async function archiveCollection(collection: CustomCollection) {
    if (!window.confirm(`Archive “${collection.name}”? Its public gallery and landing card will be hidden.`)) {
      return;
    }
    setSavingSlug(collection.id);
    setMessage("");
    setError("");
    try {
      await AdminApiService.archiveCustomCollection(routeSlugs[collection.id] || collection.slug);
      patch(collection.id, { status: "archived", showOnLanding: false });
      setMessage(`${collection.name} archived.`);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive gallery.",
      );
    } finally {
      setSavingSlug("");
    }
  }

  const selected = sorted.find(collection => collection.id === selectedId) || sorted[0];
  return <div className="admin-page studio-page">
    <AdminPageHeader title="Collections" backLink={<StudioBackLink />} meta={<span>{sorted.length + 1} galleries</span>}
      actions={<AdminButton icon={Plus} data-admin-action="create" onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate} aria-controls="studio-add-gallery">Add gallery</AdminButton>} />
    {message ? <div className="admin-alert admin-alert--success" role="status">{message}</div> : null}
    {error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null}
    {showCreate ? <AdminPanel title="Add gallery"><form id="studio-add-gallery" className="studio-create-row" onSubmit={event => {event.preventDefault(); void createCollection();}}>
      <AdminField label="Gallery name"><input className="admin-input" autoFocus value={newName} onChange={event => setNewName(event.target.value)} /></AdminField>
      <AdminButton type="submit" icon={Plus} variant="primary" disabled={loading || creating || !newName.trim()}>{creating ? "Creating…" : "Create gallery"}</AdminButton>
    </form></AdminPanel> : null}
    {loading ? <p role="status">Loading collections…</p> : <div className="studio-workspace">
      <div className="studio-record-list" aria-label="Collections">
        <Link to="/admin/creative-flash" className="studio-record-choice studio-record-row" aria-label="Open Creative Flash gallery">
          <span className="studio-thumbnail"><Zap aria-hidden="true" /></span><span><strong>Creative Flash</strong></span><ArrowRight className="studio-destination__arrow" aria-hidden="true" />
        </Link>
        {sorted.map(collection => <button key={collection.id} type="button" className={`studio-record-choice studio-record-row ${selected?.id === collection.id ? "is-selected" : ""}`} aria-pressed={selected?.id === collection.id} onClick={() => setSelectedId(collection.id)}>
        <StudioThumbnail src={collection.heroImage?.thumbSrc || collection.heroImage?.fullSrc} />
        <span><strong>{collection.name || "Untitled collection"}</strong><small>{collection.visibleImageCount} images · {collection.status}</small></span>
      </button>)}</div>
      {selected ? <AdminPanel title={selected.name || "Gallery details"} actions={<>
        <AdminActionRouterLink to={`/admin/custom-collections/${encodeURIComponent(routeSlugs[selected.id] || selected.slug)}/gallery`} className="admin-button admin-button--secondary" aria-label="Manage gallery images"><Images /></AdminActionRouterLink>
        <AdminButton icon={Archive} onClick={() => void archiveCollection(selected)} disabled={selected.status === "archived" || savingSlug === selected.id}>Archive gallery</AdminButton>
        <AdminButton data-admin-action="save" icon={Save} variant="primary" onClick={() => void saveCollection(selected)} disabled={savingSlug === selected.id}>{savingSlug === selected.id ? "Saving…" : "Save gallery"}</AdminButton>
      </>}>
        <div className="studio-form-grid">
          <AdminField label="Name"><input className="admin-input" value={selected.name} onChange={event => patch(selected.id, {name: event.target.value})} /></AdminField>
          <AdminField label="Slug"><input className="admin-input" value={selected.slug} onChange={event => patch(selected.id, {slug: slugify(event.target.value)})} /></AdminField>
          <AdminField label="Description" className="studio-span-all"><textarea className="admin-textarea" rows={3} value={selected.description} onChange={event => patch(selected.id, {description: event.target.value})} /></AdminField>
          <AdminField label="Status"><select className="admin-select" value={selected.status} onChange={event => patch(selected.id, {status: event.target.value as CustomCollection["status"]})}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></AdminField>
          <AdminField label="Landing order"><input className="admin-input" type="number" min={1} value={selected.sortOrder} onChange={event => patch(selected.id, {sortOrder: Number(event.target.value || 0)})} /></AdminField>
        </div>
        <div className="studio-options"><StudioToggle checked={selected.showOnLanding} onChange={event => patch(selected.id, {showOnLanding: event.target.checked})}>Show on gallery page</StudioToggle></div>
        <details className="studio-disclosure"><summary>Search appearance</summary><div className="studio-form-grid">
          <AdminField label="SEO title" className="studio-span-all"><input className="admin-input" value={selected.seoTitle} onChange={event => patch(selected.id, {seoTitle: event.target.value})} /></AdminField>
          <AdminField label="SEO description" className="studio-span-all"><textarea className="admin-textarea" rows={3} value={selected.seoDescription} onChange={event => patch(selected.id, {seoDescription: event.target.value})} /></AdminField>
        </div></details>
        <p className="studio-meta">{selected.imageCount} selected images · {selected.visibleImageCount} visible</p>
      </AdminPanel> : <AdminEmptyState icon={Images} title="Add your first gallery" />}
    </div>}
  </div>;
}
