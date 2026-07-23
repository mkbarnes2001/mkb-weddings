import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminApiService } from "../services/AdminApiService";
import type {
  AssetLibraryFilters,
  AssetLibraryPayload,
  AssetRecord,
} from "../types/asset";

const emptyPayload: AssetLibraryPayload = {
  workspaceId: "",
  assets: [],
  facets: { weddings: [], venues: [], moments: [], galleries: [] },
  pagination: { total: 0, limit: 60, offset: 0, hasMore: false },
  stats: { totalAssets: 0, originalAssets: 0, compatibilityAssets: 0 },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value || 0);
}

function cleanAssetLabel(asset: AssetRecord) {
  const raw = (asset.originalFilename || asset.filename || "Untitled asset").trim();
  const withoutPath = raw.split(/[\\/]/).pop() || raw;
  const withoutExtension = withoutPath.replace(/\.[a-z0-9]{2,5}$/i, "");
  const withoutCommonPrefix = withoutExtension.replace(/^mkb[-_ ]weddings[-_ ]?/i, "");
  return withoutCommonPrefix.replace(/_/g, " ").replace(/\s+/g, " ").trim() || raw;
}

function AssetImage({
  primary,
  fallback,
  alt,
  loading = "lazy",
}: {
  primary?: string;
  fallback?: string;
  alt: string;
  loading?: "eager" | "lazy";
}) {
  const candidates = useMemo(() => Array.from(new Set([primary, fallback].filter(Boolean) as string[])), [primary, fallback]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [primary, fallback]);

  const src = candidates[candidateIndex];
  if (!src) return <ImageIcon size={28} color="#888" />;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setCandidateIndex((current) => current + 1)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: candidateIndex >= candidates.length ? "none" : "block" }}
    />
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 18, padding: 18, background: "rgba(255,255,255,.62)" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: "#737373" }}>{label}</div>
      <div style={{ marginTop: 8, fontFamily: "serif", fontSize: 28 }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "#737373", lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

function RelationGroup({ title, items, empty = "None" }: { title: string; items: Array<{ name: string; type?: string; inherited?: boolean }>; empty?: string }) {
  return (
    <section style={{ borderTop: "1px solid rgba(0,0,0,.1)", paddingTop: 16 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: "#737373", marginBottom: 9 }}>{title}</div>
      {items.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {items.map((item, index) => (
            <span key={`${item.name}-${index}`} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 999, padding: "6px 9px", background: "#fff", fontSize: 12 }}>
              {item.type ? `${item.type}: ` : ""}{item.name}{item.inherited ? " · inherited" : ""}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#8a8a8a" }}>{empty}</div>
      )}
    </section>
  );
}

export function AssetLibrary() {
  const [payload, setPayload] = useState<AssetLibraryPayload>(emptyPayload);
  const [filters, setFilters] = useState<AssetLibraryFilters>({ limit: 60, offset: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const activeAsset = useMemo(
    () => payload.assets.find((asset) => asset.id === activeId) || payload.assets[0] || null,
    [payload.assets, activeId],
  );

  async function load(nextFilters: AssetLibraryFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const result = await AdminApiService.getAssetLibrary(nextFilters);
      setPayload(result);
      setActiveId((current) => result.assets.some((asset) => asset.id === current) ? current : (result.assets[0]?.id || ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the Asset Library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.wedding, filters.venue, filters.moment, filters.gallery, filters.unassigned, filters.offset]);

  function setFilter(key: keyof AssetLibraryFilters, value: string | boolean | number | undefined) {
    setFilters((current) => ({ ...current, [key]: value || undefined, offset: 0 }));
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = { ...filters, q: searchInput.trim() || undefined, offset: 0 };
    setFilters(next);
    void load(next);
  }

  async function sync() {
    setSyncing(true);
    setError("");
    try {
      await AdminApiService.syncAssetLibrary();
      await load(filters);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sync the Asset Library.");
    } finally {
      setSyncing(false);
    }
  }

  const start = payload.pagination.total ? payload.pagination.offset + 1 : 0;
  const end = Math.min(payload.pagination.offset + payload.assets.length, payload.pagination.total);

  return (
    <div style={{ maxWidth: 1680, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 24, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#737373" }}>Workspace assets</div>
          <h1 style={{ margin: "8px 0 0", fontFamily: "serif", fontSize: 40, fontWeight: 500 }}>Asset Library</h1>
          <p style={{ margin: "10px 0 0", maxWidth: 760, color: "#666", lineHeight: 1.65 }}>
            One canonical record for every photograph. Existing MKB images are indexed without copying R2 objects, while future private originals can live behind the same asset identity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          style={{ border: "1px solid #111", borderRadius: 999, padding: "11px 16px", background: "#111", color: "#fff", display: "flex", alignItems: "center", gap: 8, cursor: syncing ? "wait" : "pointer" }}
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Indexing…" : "Index missing assets"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginTop: 26 }}>
        <StatCard label="Canonical assets" value={formatNumber(payload.stats.totalAssets)} note="Workspace-owned asset identities." />
        <StatCard label="Existing public assets" value={formatNumber(payload.stats.compatibilityAssets)} note="Indexed from the proven images/R2 model." />
        <StatCard label="Private originals" value={formatNumber(payload.stats.originalAssets)} note="Reserved for the client-gallery upload pipeline." />
        <StatCard label="Current results" value={formatNumber(payload.pagination.total)} note="After the active filters below." />
      </div>

      <div style={{ marginTop: 18, border: "1px solid rgba(0,0,0,.12)", borderRadius: 20, padding: 16, background: "rgba(255,255,255,.62)" }}>
        <form onSubmit={submitSearch} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", border: "1px solid rgba(0,0,0,.15)", borderRadius: 12, background: "#fff", overflow: "hidden", minWidth: 0 }}>
            <Search size={16} style={{ margin: "12px 0 0 12px", color: "#777" }} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search filename, alt or caption" style={{ width: "100%", border: 0, outline: 0, padding: "10px 12px", background: "transparent" }} />
          </div>
          <select value={filters.wedding || ""} onChange={(e) => setFilter("wedding", e.target.value)} style={selectStyle}>
            <option value="">All weddings</option>
            {payload.facets.weddings.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <select value={filters.venue || ""} onChange={(e) => setFilter("venue", e.target.value)} style={selectStyle}>
            <option value="">All venues</option>
            {payload.facets.venues.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <select value={filters.moment || ""} onChange={(e) => setFilter("moment", e.target.value)} style={selectStyle}>
            <option value="">All moments</option>
            {payload.facets.moments.map((item) => <option key={item.id || item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <select value={filters.gallery || ""} onChange={(e) => setFilter("gallery", e.target.value)} style={selectStyle}>
            <option value="">All galleries</option>
            {payload.facets.galleries.map((item) => <option key={item.id || item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <button type="submit" style={{ ...buttonStyle, background: "#111", color: "#fff", borderColor: "#111" }}>Search</button>
        </form>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555" }}>
            <input type="checkbox" checked={Boolean(filters.unassigned)} onChange={(e) => setFilter("unassigned", e.target.checked)} />
            Show only assets with no wedding, venue or custom gallery assignment
          </label>
          <button type="button" onClick={() => { const next = { limit: 60, offset: 0 }; setSearchInput(""); setFilters(next); void load(next); }} style={{ ...buttonStyle, padding: "8px 12px" }}>Clear filters</button>
        </div>
      </div>

      {error ? <div style={{ marginTop: 16, border: "1px solid #b91c1c", background: "#fff7f7", color: "#991b1b", borderRadius: 14, padding: 14 }}>{error}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 20, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 760px", minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: 50, textAlign: "center", color: "#737373" }}>Loading assets…</div>
          ) : payload.assets.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
              {payload.assets.map((asset) => <AssetCard key={asset.id} asset={asset} active={activeAsset?.id === asset.id} onClick={() => setActiveId(asset.id)} />)}
            </div>
          ) : (
            <div style={{ border: "1px dashed rgba(0,0,0,.22)", borderRadius: 20, padding: 60, textAlign: "center", color: "#737373" }}>
              No assets match these filters.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <div style={{ fontSize: 13, color: "#737373" }}>{start}–{end} of {formatNumber(payload.pagination.total)}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={payload.pagination.offset <= 0 || loading} onClick={() => setFilters((current) => ({ ...current, offset: Math.max(0, Number(current.offset || 0) - Number(current.limit || 60)) }))} style={buttonStyle}><ChevronLeft size={15} /> Previous</button>
              <button type="button" disabled={!payload.pagination.hasMore || loading} onClick={() => setFilters((current) => ({ ...current, offset: Number(current.offset || 0) + Number(current.limit || 60) }))} style={buttonStyle}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        </div>

        <aside style={{ position: "sticky", top: 110, flex: "1 1 320px", maxWidth: 380, minWidth: 280, border: "1px solid rgba(0,0,0,.13)", borderRadius: 20, background: "rgba(255,255,255,.78)", overflow: "hidden" }}>
          {activeAsset ? <AssetInspector asset={activeAsset} /> : <div style={{ padding: 24, color: "#737373" }}>Select an asset to inspect it.</div>}
        </aside>
      </div>
    </div>
  );
}

function AssetCard({ asset, active, onClick }: { asset: AssetRecord; active: boolean; onClick: () => void }) {
  const fullFilename = asset.originalFilename || asset.filename || "Untitled asset";
  return (
    <button type="button" onClick={onClick} style={{ border: active ? "2px solid #111" : "1px solid rgba(0,0,0,.12)", padding: active ? 0 : 1, borderRadius: 14, overflow: "hidden", background: "#fff", textAlign: "left", cursor: "pointer", minWidth: 0 }}>
      <div style={{ aspectRatio: "4 / 3", background: "#e8e5df", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AssetImage primary={asset.files.thumb} fallback={asset.files.web} alt={asset.alt || fullFilename} />
      </div>
      <div style={{ padding: 9 }}>
        <div title={fullFilename} style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cleanAssetLabel(asset)}</div>
        <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {asset.weddings.length ? <SmallBadge text={`${asset.weddings.length} wedding${asset.weddings.length === 1 ? "" : "s"}`} /> : null}
          {asset.venues.length ? <SmallBadge text={`${asset.venues.length} venue${asset.venues.length === 1 ? "" : "s"}`} /> : null}
          {asset.moments.length ? <SmallBadge text={`${asset.moments.length} moment${asset.moments.length === 1 ? "" : "s"}`} /> : null}
          {asset.galleries.length ? <SmallBadge text={`${asset.galleries.length} gallery${asset.galleries.length === 1 ? "" : "s"}`} /> : null}
        </div>
      </div>
    </button>
  );
}

function SmallBadge({ text }: { text: string }) {
  return <span style={{ borderRadius: 999, background: "#f0eee9", padding: "3px 6px", fontSize: 10, color: "#666" }}>{text}</span>;
}

function AssetInspector({ asset }: { asset: AssetRecord }) {
  return (
    <div>
      <div style={{ aspectRatio: "16 / 11", background: "#e8e5df", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AssetImage primary={asset.files.web} fallback={asset.files.thumb} alt={asset.alt || asset.filename} loading="eager" />
      </div>
      <div style={{ padding: 20, display: "grid", gap: 17 }}>
        <section>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: "#737373" }}>Asset identity</div>
          <div style={{ marginTop: 8, fontWeight: 600, overflowWrap: "anywhere" }}>{asset.originalFilename || asset.filename}</div>
          <div style={{ marginTop: 5, fontSize: 12, color: "#777", overflowWrap: "anywhere" }}>{asset.id}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SmallBadge text={`${asset.width || "?"} × ${asset.height || "?"}`} />
            <SmallBadge text={asset.source.storage || asset.sourceType || "legacy"} />
            <SmallBadge text={asset.compatibilityBacked ? "compatibility indexed" : "native asset"} />
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={fileCardStyle}><HardDrive size={16} /><strong>Web</strong><span>{asset.files.web ? "Available" : "Missing"}</span></div>
          <div style={fileCardStyle}><ImageIcon size={16} /><strong>Thumb</strong><span>{asset.files.thumb ? "Available" : asset.files.web ? "Missing · using web fallback" : "Missing"}</span></div>
          <div style={{ ...fileCardStyle, gridColumn: "1 / -1" }}><LockKeyhole size={16} /><strong>Private original</strong><span>{asset.files.original ? "Stored privately" : "Not yet stored — enabled by Client Galleries phase"}</span></div>
        </section>

        <RelationGroup title="Wedding" items={asset.weddings} />
        <RelationGroup title="Venue" items={asset.venues} />
        <RelationGroup title="Moments" items={asset.moments} />
        <RelationGroup title="Locations" items={asset.locations.map((item) => ({ ...item, type: item.type }))} empty="Inherited automatically when a venue has location assignments." />
        <RelationGroup title="Galleries" items={asset.galleries} />

        <section style={{ borderTop: "1px solid rgba(0,0,0,.1)", paddingTop: 16, color: "#666", fontSize: 12, lineHeight: 1.55 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#333", marginBottom: 6 }}><Layers3 size={15} /> Compatibility phase</div>
          Existing Venue, Moment and Gallery managers remain authoritative in v1.0.0. The Asset Library reads those live relationships while the canonical asset identity is established underneath them.
        </section>
      </div>
    </div>
  );
}

const selectStyle: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(0,0,0,.15)",
  borderRadius: 12,
  padding: "10px 11px",
  background: "#fff",
  outline: 0,
  minWidth: 0,
};

const buttonStyle: CSSProperties = {
  border: "1px solid rgba(0,0,0,.18)",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  cursor: "pointer",
};

const fileCardStyle: CSSProperties = {
  border: "1px solid rgba(0,0,0,.1)",
  borderRadius: 12,
  padding: 11,
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "4px 8px",
  alignItems: "center",
  fontSize: 12,
  background: "#fff",
};
