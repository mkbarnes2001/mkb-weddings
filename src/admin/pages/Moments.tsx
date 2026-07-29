import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Images,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type {
  MomentRecord,
  MomentRepositoryDocument,
} from "../types/moment";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function Moments() {
  const [document, setDocument] =
    useState<MomentRepositoryDocument | null>(null);
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
            moments: updater(current.moments).map((moment, index) => ({
              ...moment,
              sortOrder: index + 1,
            })),
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

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Default Gallery · Moments
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">
              Moment categories
            </h1>
            <p className="mt-4 max-w-2xl text-white/60">
              This is a default dynamic gallery, but its categories are yours to customise. Create, rename, reorder or archive moments and control which cards appear publicly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addMoment}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              Add moment
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : dirty ? "Save moments" : "Saved"}
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-black/10 bg-white/80 p-5 text-sm leading-relaxed text-neutral-600">
        Every photography workspace starts with a Moments gallery, but the taxonomy is not fixed. These categories define how this workspace organises and presents wedding-day moments.
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {sortedMoments.map((moment) => (
          <article
            key={moment.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(moment.id)}
            className={`rounded-[24px] border border-black/10 bg-white/85 p-5 ${
              moment.status === "archived" ? "opacity-55" : ""
            }`}
          >
            {heroImages[moment.slug] ? (
              <div className="mb-5 overflow-hidden rounded-[18px] bg-neutral-100" style={{ aspectRatio: "16 / 9" }}>
                <img
                  src={heroImages[moment.slug].thumbSrc || heroImages[moment.slug].fullSrc}
                  alt={heroImages[moment.slug].alt || `${moment.name} hero`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="mb-5 flex items-center justify-center rounded-[18px] bg-neutral-100 text-sm text-neutral-400" style={{ aspectRatio: "16 / 9" }}>
                Set a hero in Manage gallery
              </div>
            )}
            <div className="grid grid-cols-1 gap-5">
              <div
                draggable
                onDragStart={() => setDraggedId(moment.id)}
                onDragEnd={() => setDraggedId(null)}
                className="w-fit cursor-grab rounded-full border border-black/10 bg-white p-3"
                title="Drag to reorder"
              >
                <GripVertical className="h-5 w-5" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Name
                  </span>
                  <input
                    value={moment.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      updateMoment(moment.id, {
                        name,
                        slug: slugify(name),
                      });
                    }}
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Slug
                  </span>
                  <input
                    value={moment.slug}
                    onChange={(event) =>
                      updateMoment(moment.id, {
                        slug: slugify(event.target.value),
                      })
                    }
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 font-mono text-sm"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4">
                  <span className="text-sm">Available for image assignment</span>
                  <input
                    type="checkbox"
                    checked={moment.availableForAssignment}
                    onChange={(event) =>
                      updateMoment(moment.id, {
                        availableForAssignment: event.target.checked,
                      })
                    }
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4">
                  <span className="text-sm">
                    Show card on Moments gallery
                  </span>
                  <input
                    type="checkbox"
                    checked={moment.showOnMomentsLanding}
                    onChange={(event) =>
                      updateMoment(moment.id, {
                        showOnMomentsLanding: event.target.checked,
                      })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2">
                {moment.status === "active" ? (
                  <Link
                    to={`/admin/moments/${encodeURIComponent(moment.slug)}/gallery`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
                  >
                    <Images className="h-4 w-4" />
                    Manage gallery
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => archiveMoment(moment.id)}
                  disabled={moment.status === "archived"}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Archive
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Card image ID (optional)
                </span>
                <input
                  value={moment.cardImageId}
                  onChange={(event) =>
                    updateMoment(moment.id, { cardImageId: event.target.value.trim() })
                  }
                  placeholder="Paste an image ID / asset key, or leave blank for automatic"
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-neutral-500">
                  Leave blank to use the first eligible image assigned to this moment.
                </p>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                Description
              </span>
              <textarea
                value={moment.description}
                onChange={(event) =>
                  updateMoment(moment.id, {
                    description: event.target.value,
                  })
                }
                rows={3}
                className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
              />
            </label>
          </article>
        ))}
      </section>
    </div>
  );
}
