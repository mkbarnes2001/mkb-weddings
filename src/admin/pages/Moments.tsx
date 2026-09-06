import { AdminActionButton, AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { useEffect, useMemo, useState } from "react";
import { GripVertical, Images, Plus, Save, Trash2 } from "lucide-react";
import { AdminButton, AdminPageHeader, AdminPanel, AdminField, AdminStatus, AdminEmptyState } from "../components/ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import type {
  MomentRecord,
  MomentRepositoryDocument,
} from "../types/moment";

import { StudioBackLink, StudioThumbnail, StudioToggle } from "../components/ui/StudioUI";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function applyMomentChanges(moments: MomentRecord[], updater: (rows: MomentRecord[]) => MomentRecord[]) {
  return updater([...moments].sort((a, b) => a.sortOrder - b.sortOrder))
    .map((moment, index) => ({...moment, sortOrder: index + 1}));
}

export function Moments() {
  const [document, setDocument] =
    useState<MomentRepositoryDocument | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [heroImages, setHeroImages] = useState<Record<string, { thumbSrc: string; fullSrc: string; alt: string }>>({});

  useEffect(() => {
    AdminApiService.getMoments()
      .then(setDocument)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load moments.",
        ),
      );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const moments = document?.moments || [];

    if (!moments.length) {
      setHeroImages({});
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      moments.map(async (moment) => {
        try {
          const gallery = await AdminApiService.getMomentGallery(moment.slug);
          const hidden = new Set((gallery.moment.hiddenImageIds || []).map(String));
          const eligible = gallery.images.filter(
            (image) => image.globallyEnabled && !hidden.has(image.assetKey),
          );
          const wanted = String(
            gallery.moment.cardImageId || gallery.moment.heroImageId || "",
          );
          const hero =
            eligible.find(
              (image) =>
                wanted &&
                (image.assetKey === wanted || image.imageId === wanted),
            ) || eligible[0] || null;

          return hero
            ? {
                slug: moment.slug,
                image: {
                  thumbSrc: hero.thumbSrc,
                  fullSrc: hero.fullSrc,
                  alt: hero.alt || `${moment.name} hero`,
                },
              }
            : null;
        } catch {
          return null;
        }
      }),
    ).then((items) => {
      if (cancelled) return;
      const next: Record<
        string,
        { thumbSrc: string; fullSrc: string; alt: string }
      > = {};
      for (const item of items) {
        if (item) next[item.slug] = item.image;
      }
      setHeroImages(next);
    });

    return () => {
      cancelled = true;
    };
  }, [document?.updatedAt]);

  const sortedMoments = useMemo(
    () =>
      [...(document?.moments || [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [document],
  );

  function commit(
    updater: (moments: MomentRecord[]) => MomentRecord[],
  ) {
    setDocument((current) =>
      current
        ? {
            ...current,
            moments: applyMomentChanges(current.moments, updater),
          }
        : current,
    );
    setDirty(true);
    setMessage("");
    setError("");
  }

  function updateMoment(
    id: string,
    patch: Partial<MomentRecord>,
  ) {
    commit((moments) =>
      moments.map((moment) =>
        moment.id === id ? { ...moment, ...patch } : moment,
      ),
    );
  }

  function addMoment() {
    const id = `moment_${crypto.randomUUID()}`;

    commit((moments) => [
      ...moments,
      {
        id,
        name: "New moment",
        slug: `new-moment-${moments.length + 1}`,
        description: "",
        availableForAssignment: true,
        showOnMomentsLanding: false,
        cardImageId: "",
        sortOrder: moments.length + 1,
        status: "active",
      },
    ]);
    setSelectedId(id);
  }

  function archiveMoment(id: string) {
    updateMoment(id, {
      status: "archived",
      availableForAssignment: false,
      showOnMomentsLanding: false,
    });
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    commit((moments) => {
      const next = [...moments].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );

      const fromIndex = next.findIndex(
        (moment) => moment.id === draggedId,
      );
      const targetIndex = next.findIndex(
        (moment) => moment.id === targetId,
      );

      if (fromIndex < 0 || targetIndex < 0) return moments;

      const [moved] = next.splice(fromIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });

    setDraggedId(null);
  }

  async function save() {
    if (!document) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await AdminApiService.saveMoments({
        ...document,
        updatedAt: new Date().toISOString(),
        moments: sortedMoments,
      });

      setDocument(result.document);
      setDirty(false);
      setMessage(
        result.backupPath
          ? `Saved. Backup created at ${result.backupPath}.`
          : "Saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save moments.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!document) {
    return (
      <div className="text-neutral-500">
        {error || "Loading moments…"}
      </div>
    );
  }

  const selected = sortedMoments.find(moment => moment.id === selectedId) || sortedMoments[0];
  return <div className="admin-page studio-page">
    <AdminPageHeader title="Moments" backLink={<StudioBackLink />} meta={<span>{sortedMoments.length} moments</span>}
      actions={<><AdminButton icon={Plus} onClick={addMoment}>Add moment</AdminButton><AdminButton variant="primary" icon={Save} onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : dirty ? "Save moments" : "Saved"}</AdminButton></>} />
    {message ? <div className="admin-alert admin-alert--success" role="status">Moments saved.</div> : null}
    {error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null}
    {!selected ? <AdminEmptyState icon={Images} title="No moments yet" /> : <div className="studio-workspace">
      <div className="studio-record-list" aria-label="Moments">
        {sortedMoments.map(moment => <article className={`studio-record-row ${selected.id === moment.id ? "is-selected" : ""}`} key={moment.id} onDragOver={event => event.preventDefault()} onDrop={() => handleDrop(moment.id)}>
          <span className="studio-drag" draggable title="Drag to reorder" onDragStart={() => setDraggedId(moment.id)} onDragEnd={() => setDraggedId(null)}><GripVertical aria-hidden="true" /></span>
          <button type="button" className="studio-record-choice" aria-pressed={selected.id === moment.id} onClick={() => setSelectedId(moment.id)}>
            <StudioThumbnail src={heroImages[moment.slug]?.thumbSrc} />
            <span><strong>{moment.name || "Untitled moment"}</strong><small>{moment.status === "archived" ? "Archived" : moment.showOnMomentsLanding ? "Visible" : "Hidden"}</small></span>
          </button>
        </article>)}
      </div>
      <AdminPanel title={selected.name || "Moment details"} actions={<>
        {selected.status === "active" ? <AdminActionRouterLink to={`/admin/moments/${encodeURIComponent(selected.slug)}/gallery`} className="admin-button admin-button--secondary" aria-label="Manage moment images"><Images /></AdminActionRouterLink> : null}
        <AdminActionButton onClick={() => archiveMoment(selected.id)} disabled={selected.status === "archived"} className="admin-button admin-button--secondary" aria-label="Archive moment"><Trash2 /></AdminActionButton>
      </>}>
        <div className="studio-form-grid">
          <AdminField label="Name"><input className="admin-input" value={selected.name} onChange={event => updateMoment(selected.id, {name: event.target.value, slug: slugify(event.target.value)})} /></AdminField>
          <AdminField label="Slug"><input className="admin-input" value={selected.slug} onChange={event => updateMoment(selected.id, {slug: slugify(event.target.value)})} /></AdminField>
          <AdminField label="Description" className="studio-span-all"><textarea className="admin-textarea" rows={3} value={selected.description} onChange={event => updateMoment(selected.id, {description: event.target.value})} /></AdminField>
        </div>
        <div className="studio-options">
          <StudioToggle checked={selected.availableForAssignment} onChange={event => updateMoment(selected.id, {availableForAssignment: event.target.checked})}>Available for image assignment</StudioToggle>
          <StudioToggle checked={selected.showOnMomentsLanding} onChange={event => updateMoment(selected.id, {showOnMomentsLanding: event.target.checked})}>Show in Moments gallery</StudioToggle>
          {selected.status === "archived" ? <AdminStatus>Archived</AdminStatus> : null}
        </div>
      </AdminPanel>
    </div>}
  </div>;
}
