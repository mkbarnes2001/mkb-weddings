import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Images,
  Plus,
  Save,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type { CustomCollection } from "../types/customCollection";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CustomCollections() {
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [routeSlugs, setRouteSlugs] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingSlug, setSavingSlug] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const loaded = await AdminApiService.listCustomCollections();
      setCollections(loaded);
      setRouteSlugs(Object.fromEntries(loaded.map((collection) => [collection.id, collection.slug])));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load custom collections.",
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
    if (!name) return;
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
      setNewName("");
      setMessage(`${collection.name} created. Add images before making it public.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create collection.",
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
          : "Unable to save collection.",
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
          : "Unable to archive collection.",
      );
    } finally {
      setSavingSlug("");
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-black p-8 text-white md:p-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/45">
              Custom Collections
            </p>
            <h1 className="font-serif text-5xl md:text-6xl">Reusable galleries</h1>
            <p className="mt-4 max-w-3xl text-white/60">
              Create subject-led galleries such as Beach Weddings, Winter Weddings,
              Black &amp; White or Castle Weddings. Images are referenced, never duplicated.
            </p>
          </div>

          <Link
            to="/admin/gallery"
            className="rounded-full border border-white/20 px-5 py-3 text-center text-sm"
          >
            Back to Gallery Management
          </Link>
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

      <section className="rounded-[28px] border border-black/10 bg-white/85 p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
          Add collection
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createCollection();
            }}
            placeholder="For example: Beach Weddings"
            className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void createCollection()}
            disabled={creating || !newName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "Create collection"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {sorted.map((collection) => (
          <article
            key={collection.id}
            className={`overflow-hidden rounded-[24px] border border-black/10 bg-white/85 ${
              collection.status === "archived" ? "opacity-55" : ""
            }`}
          >
            {collection.heroImage ? (
              <div style={{ aspectRatio: "16 / 9", overflow: "hidden", background: "#f5f5f5" }}>
                <img
                  src={collection.heroImage.thumbSrc || collection.heroImage.fullSrc}
                  alt={collection.heroImage.alt || `${collection.name} gallery hero`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex items-center justify-center bg-neutral-100 text-sm text-neutral-400"
                style={{ aspectRatio: "16 / 9" }}
              >
                Select a hero in Manage gallery
              </div>
            )}

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Name
                  </span>
                  <input
                    value={collection.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      patch(collection.id, { name, slug: slugify(name) });
                    }}
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Slug
                  </span>
                  <input
                    value={collection.slug}
                    onChange={(event) => patch(collection.id, { slug: slugify(event.target.value) })}
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 font-mono text-sm"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Description
                </span>
                <textarea
                  value={collection.description}
                  onChange={(event) => patch(collection.id, { description: event.target.value })}
                  rows={3}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Status
                  </span>
                  <select
                    value={collection.status}
                    onChange={(event) =>
                      patch(collection.id, {
                        status: event.target.value as CustomCollection["status"],
                      })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Landing order
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={collection.sortOrder}
                    onChange={(event) =>
                      patch(collection.id, { sortOrder: Number(event.target.value || 0) })
                    }
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4">
                <span className="text-sm">Show card on main Gallery landing</span>
                <input
                  type="checkbox"
                  checked={collection.showOnLanding}
                  onChange={(event) =>
                    patch(collection.id, { showOnLanding: event.target.checked })
                  }
                />
              </label>

              <details className="rounded-2xl border border-black/10 p-4">
                <summary className="cursor-pointer text-sm font-medium">SEO fields</summary>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                      SEO title
                    </span>
                    <input
                      value={collection.seoTitle}
                      onChange={(event) => patch(collection.id, { seoTitle: event.target.value })}
                      className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                      SEO description
                    </span>
                    <textarea
                      value={collection.seoDescription}
                      onChange={(event) =>
                        patch(collection.id, { seoDescription: event.target.value })
                      }
                      rows={3}
                      className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm"
                    />
                  </label>
                </div>
              </details>

              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-neutral-100 p-3 text-center">
                <div>
                  <p className="text-xs text-neutral-500">Selected</p>
                  <p className="mt-1 text-xl">{collection.imageCount}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Visible</p>
                  <p className="mt-1 text-xl">{collection.visibleImageCount}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Public</p>
                  <p className="mt-1 text-sm font-medium">
                    {collection.status === "active" ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <Link
                  to={`/admin/custom-collections/${encodeURIComponent(collection.slug)}/gallery`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm text-white"
                >
                  <Images className="h-4 w-4" />
                  Manage gallery
                </Link>
                <button
                  type="button"
                  onClick={() => void saveCollection(collection)}
                  disabled={savingSlug === collection.id}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {savingSlug === collection.id ? "Saving…" : "Save details"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => void archiveCollection(collection)}
                disabled={collection.status === "archived" || savingSlug === collection.id}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-sm text-red-700 disabled:opacity-40"
              >
                <Archive className="h-4 w-4" />
                Archive collection
              </button>
            </div>
          </article>
        ))}
      </section>

      {!sorted.length ? (
        <section className="rounded-[28px] border border-dashed border-black/15 bg-white/60 p-12 text-center text-neutral-500">
          No custom collections yet. Create the first one above.
        </section>
      ) : null}
    </div>
  );
}
