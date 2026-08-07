import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  ImagePlus,
  Instagram,
  Loader2,
  MapPin,
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
import { AdminApiService, type LocationConfiguration, type VenueDiscoveryResult, type WorkspaceRecord } from "../services/AdminApiService";
import { SupplierService, type MasterSupplier, type SupplierRecord } from "../services/SupplierService";
import { uploadPrivateOriginal } from "../lib/privateOriginalUpload";
import type { VenueSummary } from "../types/venue";
import type { WeddingWorkspacePayload } from "../types/weddingWorkspace";
import { COUNTRY_OPTIONS } from "../data/countries";
import { AdminSearchSelect, type AdminSearchSelectOption } from "../components/ui/AdminSearchSelect";
import {
  DEFAULT_SUPPLIER_ROLE_DEFINITIONS,
  SUPPLIER_CATEGORY_OPTIONS,
  configuredSupplierCategory,
  configuredWeddingRole,
  defaultWeddingRoleForCategory,
  normaliseSupplierTaxonomy,
  weddingRoleOptionsForCategory,
  type SupplierRoleDefinition,
  type SupplierTaxonomySettings,
} from "../data/supplierTaxonomy";
import { AdminPageHeader } from "../components/ui/AdminUI";

const PUBLIC_ORIGIN = "https://www.mkbweddings.co.uk";

function roleSearchOptions(category: string, categories: readonly string[], roles: readonly SupplierRoleDefinition[]): AdminSearchSelectOption[] {
  return weddingRoleOptionsForCategory(category, categories, roles).map((role) => ({ value: role, label: role }));
}

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

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function matchKey(value: string) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function looksSimilar(left: string, right: string) {
  const a = matchKey(left);
  const b = matchKey(right);
  return Boolean(a && b && (a === b || (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a)))));
}

function normaliseWebsite(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function displayDate(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function publicGalleryUrl(slug: string, token: string) {
  const segment = slug ? encodeURIComponent(slug) : encodeURIComponent(token);
  return `${PUBLIC_ORIGIN}/client-gallery/${segment}`;
}

export function WeddingWorkspace() {
  const { slug = "" } = useParams<{ slug: string }>();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<WeddingWorkspacePayload | null>(null);
  const [wedding, setWedding] = useState<WeddingDocument | null>(null);
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [locationConfig, setLocationConfig] = useState<LocationConfiguration | null>(null);
  const [workspaceRecord, setWorkspaceRecord] = useState<WorkspaceRecord | null>(null);
  const [venuePicker, setVenuePicker] = useState("");
  const [venueDirectoryQuery, setVenueDirectoryQuery] = useState("");
  const [venueDirectoryResults, setVenueDirectoryResults] = useState<VenueDiscoveryResult[]>([]);
  const [venueDirectoryConfigured, setVenueDirectoryConfigured] = useState<boolean | null>(null);
  const [venueDirectoryBusy, setVenueDirectoryBusy] = useState(false);
  const [masterSuppliers, setMasterSuppliers] = useState<MasterSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierTaxonomy, setSupplierTaxonomy] = useState<SupplierTaxonomySettings>(() => normaliseSupplierTaxonomy(SUPPLIER_CATEGORY_OPTIONS, DEFAULT_SUPPLIER_ROLE_DEFINITIONS));
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierRole, setSupplierRole] = useState("");
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: "", town: "", county: "", country: "Northern Ireland", additionalLocationId: "", website: "", instagram: "" });
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", category: "", role: "", website: "", instagram: "", email: "" });
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
      const [nextWorkspace, nextWedding, nextVenues, supplierService, nextLocations, nextWorkspaceRecord, nextPlatform] = await Promise.all([
        AdminApiService.getWeddingWorkspace(slug),
        AdminApiService.getJsonWedding(slug),
        AdminApiService.listVenues(),
        SupplierService.load(),
        AdminApiService.getLocations(),
        AdminApiService.getWorkspace(),
        AdminApiService.getWedPlannedPlatform(),
      ]);
      setWorkspace(nextWorkspace);
      setWedding(nextWedding);
      setVenues(nextVenues.filter((venue) => venue.status !== "archived"));
      setLocationConfig(nextLocations);
      setWorkspaceRecord(nextWorkspaceRecord);
      setSupplierTaxonomy(normaliseSupplierTaxonomy(nextPlatform.supplierTaxonomy?.categories, nextPlatform.supplierTaxonomy?.roles));
      setVenuePicker(nextWedding.venue || nextWorkspace.wedding.venue || "");
      setShowVenuePicker(!nextWedding.venueSlug);
      setNewVenue((current) => ({
        ...current,
        country: current.country || nextWorkspaceRecord.settings.defaultCountry || "Northern Ireland",
      }));
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

  useEffect(() => {
    if (!workspace || !location.hash) return;
    window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [location.hash, workspace]);

  const clientGallery = workspace?.clientGalleries[0] || null;
  const supplierCategorySearchOptions = useMemo<AdminSearchSelectOption[]>(
    () => supplierTaxonomy.categories.map((category) => ({ value: category, label: category })),
    [supplierTaxonomy.categories],
  );
  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.slug === wedding?.venueSlug) || null,
    [venues, wedding?.venueSlug],
  );
  const selectedSupplier = useMemo(
    () => masterSuppliers.find((supplier) => supplier.id === selectedSupplierId) || null,
    [masterSuppliers, selectedSupplierId],
  );
  const supplierSearchOptions = useMemo<AdminSearchSelectOption[]>(
    () => masterSuppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.displayName || supplier.name,
      description: [configuredSupplierCategory(supplier.category, supplierTaxonomy.categories) || supplier.category, supplier.county || supplier.location].filter(Boolean).join(" · "),
      keywords: [supplier.name, supplier.displayName, supplier.category, supplier.instagram, supplier.email],
    })),
    [masterSuppliers, supplierTaxonomy.categories],
  );
  const supplierRoleSearchOptions = useMemo(
    () => roleSearchOptions(selectedSupplier?.category || "", supplierTaxonomy.categories, supplierTaxonomy.roles),
    [selectedSupplier?.category, supplierTaxonomy.categories, supplierTaxonomy.roles],
  );
  const newSupplierRoleSearchOptions = useMemo(
    () => roleSearchOptions(newSupplier.category, supplierTaxonomy.categories, supplierTaxonomy.roles),
    [newSupplier.category, supplierTaxonomy.categories, supplierTaxonomy.roles],
  );
  const possibleVenueMatches = useMemo(
    () => newVenue.name.trim() ? venues.filter((venue) => looksSimilar(newVenue.name, venue.name)).slice(0, 4) : [],
    [newVenue.name, venues],
  );
  const possibleSupplierMatches = useMemo(
    () => newSupplier.name.trim() ? masterSuppliers.filter((supplier) => looksSimilar(newSupplier.name, supplier.displayName || supplier.name)).slice(0, 4) : [],
    [newSupplier.name, masterSuppliers],
  );
  const activeLocations = useMemo(
    () => (locationConfig?.locations || []).filter((location) => location.status !== "archived"),
    [locationConfig?.locations],
  );
  const countyLocations = useMemo(
    () => activeLocations.filter((location) => location.areaType === "county" && (!newVenue.country || !location.country || matchKey(location.country) === matchKey(newVenue.country))),
    [activeLocations, newVenue.country],
  );
  const additionalLocations = useMemo(
    () => activeLocations.filter((location) => location.areaType !== "county"),
    [activeLocations],
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
      if (["photography", "photographer"].includes(role.toLowerCase()) && studioHandle) return;
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
      setVenuePicker(venue?.name || "");
      setMessage(venue ? `${venue.name} linked to this wedding.` : "Venue link cleared.");
      setShowVenuePicker(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update venue.");
    } finally {
      setBusy(false);
    }
  };

  const linkVenueFromPicker = async () => {
    const value = venuePicker.trim();
    if (!value) {
      await saveVenue("");
      return;
    }
    const exact = venues.find((venue) => matchKey(venue.name) === matchKey(value) || venue.slug === value);
    if (exact) {
      await saveVenue(exact.slug);
      return;
    }
    setShowNewVenue(true);
    setShowVenuePicker(true);
    setNewVenue((current) => ({ ...current, name: value }));
    setMessage(`No existing venue matched “${value}”. Complete the quick-create details below.`);
  };

  const searchVenueDirectory = async () => {
    const query = venueDirectoryQuery.trim() || newVenue.name.trim() || venuePicker.trim();
    if (query.length < 3) {
      setError("Enter at least 3 characters to search the venue directory.");
      return;
    }
    setVenueDirectoryBusy(true);
    setError("");
    try {
      const result = await AdminApiService.discoverVenues(query);
      setVenueDirectoryConfigured(result.configured);
      setVenueDirectoryResults(result.results);
      if (!result.configured) {
        setMessage("External venue directory is not configured yet. Your own venue database search remains available.");
      } else if (!result.results.length) {
        setMessage("No external venue matches found. You can still create the venue manually.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search venue directory.");
    } finally {
      setVenueDirectoryBusy(false);
    }
  };

  const useDiscoveredVenue = (venue: VenueDiscoveryResult) => {
    setShowNewVenue(true);
    setNewVenue((current) => ({
      ...current,
      name: venue.name || current.name,
      town: venue.town || current.town,
      county: venue.county || current.county,
      country: venue.country || current.country,
    }));
    setVenueDirectoryQuery(venue.name);
    setMessage("Venue details loaded from the directory. Review them before creating your own master venue record.");
  };

  const linkCreatedVenueToLocations = async (venueSlug: string, countyName: string, additionalLocationId: string) => {
    if (!locationConfig) return;
    const targetIds = new Set<string>();
    const countyMatch = locationConfig.locations.find(
      (location) => location.status !== "archived" && location.areaType === "county" && matchKey(location.name) === matchKey(countyName),
    );
    if (countyMatch) targetIds.add(countyMatch.id);
    if (additionalLocationId) targetIds.add(additionalLocationId);
    if (!targetIds.size) return;

    const nextLocations = locationConfig.locations.map((location) =>
      targetIds.has(location.id)
        ? { ...location, venueSlugs: Array.from(new Set([...(location.venueSlugs || []), venueSlug])) }
        : location,
    );
    const saved = await AdminApiService.saveLocations({ locations: nextLocations });
    setLocationConfig(saved);
  };

  const createAndLinkVenue = async () => {
    if (!wedding) return;
    const name = newVenue.name.trim();
    const finalSlug = slugify(name);
    if (!name || !finalSlug) {
      setError("Venue name is required.");
      return;
    }
    const exact = venues.find((venue) => matchKey(venue.name) === matchKey(name));
    if (exact) {
      setError(`${exact.name} already exists. Use the existing venue instead.`);
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await AdminApiService.createVenue({
        schemaVersion: 1,
        slug: finalSlug,
        name,
        town: newVenue.town.trim(),
        county: newVenue.county.trim(),
        country: newVenue.country.trim(),
        status: "draft",
        intro: "",
        description: "",
        heroImageId: "",
        links: {
          website: normaliseWebsite(newVenue.website),
          instagram: cleanInstagram(newVenue.instagram).replace(/^@/, ""),
          facebook: "",
          googleMaps: "",
        },
        contact: { email: "", phone: "", coordinatorName: "", coordinatorEmail: "" },
        practical: { address: "", parking: "", accommodation: "", ceremonyTypes: "", capacity: "", outdoorCeremony: false },
        notes: { general: "", portraitLocations: "", rainBackup: "", sunsetNotes: "", restrictions: "" },
        seo: { title: "", description: "" },
      });
      const created = result.venue;
      const updated: WeddingDocument = {
        ...wedding,
        venueSlug: created.slug,
        venueId: created.id,
        venue: created.name,
      };
      await AdminApiService.updateJsonWedding(slug, updated);
      await linkCreatedVenueToLocations(created.slug, newVenue.county.trim(), newVenue.additionalLocationId);
      setVenues((current) => [...current.filter((item) => item.slug !== created.slug), created].sort((a, b) => a.name.localeCompare(b.name)));
      setWedding(updated);
      setVenuePicker(created.name);
      setShowNewVenue(false);
      setVenueDirectoryResults([]);
      setVenueDirectoryQuery("");
      setNewVenue({ name: "", town: "", county: "", country: workspaceRecord?.settings.defaultCountry || "Northern Ireland", additionalLocationId: "", website: "", instagram: "" });
      setMessage(`${created.name} created and linked to this wedding.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create and link venue.");
    } finally {
      setBusy(false);
    }
  };

  const createAndLinkSupplier = async () => {
    const name = newSupplier.name.trim();
    if (!name) {
      setError("Supplier name is required.");
      return;
    }
    const category = configuredSupplierCategory(newSupplier.category, supplierTaxonomy.categories);
    if (!category) {
      setError("Choose a canonical supplier category from the searchable list.");
      return;
    }
    const role = configuredWeddingRole(newSupplier.role, supplierTaxonomy.roles) || defaultWeddingRoleForCategory(category, supplierTaxonomy.categories, supplierTaxonomy.roles);
    if (!role) {
      setError("Choose a canonical Wedding role from the searchable list.");
      return;
    }
    const exact = masterSuppliers.find((supplier) => matchKey(supplier.displayName || supplier.name) === matchKey(name));
    if (exact) {
      setError(`${exact.displayName || exact.name} already exists. Use the existing supplier instead.`);
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await AdminApiService.createMasterSupplier({
        name,
        displayName: name,
        category,
        website: normaliseWebsite(newSupplier.website),
        instagram: cleanInstagram(newSupplier.instagram).replace(/^@/, ""),
        email: newSupplier.email.trim(),
        status: "active",
      });
      const nextRows: SupplierRecord[] = [
        ...suppliers,
        {
          supplierId: created.id,
          role,
          name: created.name,
          website: created.website,
          instagram: created.instagram,
          email: created.email,
          phone: created.phone,
          location: created.location,
          county: created.county,
        },
      ].map((row, index) => ({ ...row, blogSlug: slug, sortOrder: String(index + 1) }));
      await AdminApiService.saveWeddingSuppliers(slug, nextRows);
      setMasterSuppliers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuppliers(nextRows);
      setShowNewSupplier(false);
      setNewSupplier({ name: "", category: "", role: "", website: "", instagram: "", email: "" });
      setMessage(`${created.name} created and linked as ${role}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create and link supplier.");
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
    const role = configuredWeddingRole(supplierRole, supplierTaxonomy.roles) || defaultWeddingRoleForCategory(selectedSupplier.category, supplierTaxonomy.categories, supplierTaxonomy.roles);
    if (!role) {
      setError("Choose a canonical Wedding role from the searchable list.");
      return;
    }
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
        importWeddingAssets: true,
      });
      setMessage("Client gallery created and existing Wedding assets imported. You can upload more photographs here immediately.");
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
    <div className="wedding-workspace space-y-5" style={{ maxWidth: 1580 }}>
      <AdminPageHeader
        eyebrow={
          <Link
            to={
              workspace.job
                ? `/admin/crm/jobs/${workspace.job.id}`
                : "/admin/weddings"
            }
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            {workspace.job
              ? `CRM Job ${workspace.job.reference}`
              : "Wedding Stories"}
          </Link>
        }
        title="Wedding Workspace"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {workspace.wedding.couple
                || workspace.wedding.title}
            </span>
            <span className="text-neutral-400">·</span>
            <span>
              {workspace.wedding.venue
                || "Venue not linked"}
            </span>
            {workspace.wedding.weddingDate ? (
              <span className="text-neutral-400">
                {displayDate(workspace.wedding.weddingDate)}
              </span>
            ) : null}
            <span className="text-neutral-400">
              {setupSteps.filter((step) => step.done).length}
              /{setupSteps.length} setup steps
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {workspace.job ? (
              <Link
                to={`/admin/crm/jobs/${workspace.job.id}`}
                className="admin-button admin-button--secondary"
              >
                Open CRM Job
              </Link>
            ) : null}
            <Link
              to={`/admin/weddings/${slug}/content`}
              className="admin-button admin-button--secondary"
            >
              Master content
            </Link>
            <Link
              to={`/admin/weddings/${slug}/publish`}
              className="admin-button admin-button--primary"
            >
              Publishing
            </Link>
          </div>
        }
      />

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div> : null}

      <div className="admin-master-detail admin-master-detail--420 wedding-workspace-layout">
        <main className="admin-master-detail__main wedding-workspace-main">
          <section className="wedding-workspace-card">
            <div className="wedding-workspace-section-header">
              <div>
                <p className="wedding-workspace-kicker">1 · Wedding setup</p>
                <h2 className="wedding-workspace-section-title">Wedding setup</h2>
                <p className="wedding-workspace-section-copy max-w-2xl">Link the venue first, then build the supplier team. Each section is managed independently without leaving this wedding.</p>
              </div>
              <Link to={`/admin/weddings/${slug}/content`} className="text-sm underline underline-offset-4">Edit full wedding record</Link>
            </div>

            <div className="mt-5 space-y-4">
              <section className="wedding-workspace-subpanel wedding-workspace-venue-panel">
                <div className="wedding-workspace-subpanel__header">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="wedding-workspace-subpanel__icon"><MapPin className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="wedding-workspace-kicker">Venue</p>
                      {selectedVenue ? (
                        <div className="mt-1 min-w-0">
                          <strong className="block truncate text-sm font-semibold text-neutral-900">{selectedVenue.name}</strong>
                          <span className="block truncate text-xs text-neutral-500">{[selectedVenue.town, selectedVenue.county].filter(Boolean).join(" · ") || "Linked to this Wedding Workspace"}</span>
                        </div>
                      ) : <p className="mt-1 text-xs text-neutral-500">No venue linked yet.</p>}
                    </div>
                  </div>
                  <div className="wedding-workspace-venue-actions">
                    {selectedVenue ? <button type="button" onClick={() => setShowVenuePicker((value) => !value)} className="admin-button admin-button--secondary admin-button--sm">{showVenuePicker ? "Close" : "Change venue"}</button> : null}
                    <button type="button" onClick={() => { setShowNewVenue((value) => !value); setShowVenuePicker(true); }} className="admin-button admin-button--secondary admin-button--sm">{showNewVenue ? "Cancel new venue" : "New venue"}</button>
                  </div>
                </div>

                {showVenuePicker || !selectedVenue ? (
                  <div className="wedding-workspace-inline-form">
                    <div className="min-w-0 flex-1">
                      <label className="wedding-workspace-field-label" htmlFor="wedding-workspace-venue-picker">Search venue database</label>
                      <input
                        id="wedding-workspace-venue-picker"
                        list="wedding-workspace-venues"
                        value={venuePicker}
                        onChange={(event) => setVenuePicker(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void linkVenueFromPicker(); } }}
                        placeholder="Type a venue name…"
                        className="admin-input"
                      />
                      <datalist id="wedding-workspace-venues">
                        {venues.map((venue) => <option key={venue.slug} value={venue.name}>{[venue.town, venue.county].filter(Boolean).join(" · ")}</option>)}
                      </datalist>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 self-end">
                      {selectedVenue ? <button type="button" disabled={busy} onClick={() => saveVenue("")} className="admin-button admin-button--ghost admin-button--sm">Clear link</button> : null}
                      <button type="button" disabled={busy} onClick={linkVenueFromPicker} className="admin-button admin-button--primary admin-button--sm">Link venue</button>
                    </div>
                  </div>
                ) : null}

                {showNewVenue ? (
                  <div className="mt-5 rounded-2xl border border-black/10 bg-white p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-base" style={{ fontWeight: 600 }}>Create a new venue</h3>
                        <p className="mt-1 text-xs text-neutral-500">Quick-create the essentials now. Full venue intelligence can be completed later.</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-black/10 bg-neutral-50 p-4">
                      <label className="text-xs uppercase tracking-[0.12em] text-neutral-500">Venue directory search</label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input value={venueDirectoryQuery} onChange={(event) => setVenueDirectoryQuery(event.target.value)} placeholder="Search by venue name and location…" className="rounded-xl border border-black/15 bg-white px-3 py-3" />
                        <button type="button" disabled={venueDirectoryBusy} onClick={searchVenueDirectory} className="admin-action-secondary">{venueDirectoryBusy ? "Searching…" : "Search directory"}</button>
                      </div>
                      {venueDirectoryConfigured === false ? <p className="mt-2 text-xs text-neutral-500">External venue lookup is optional and not configured on this workspace yet. Your own venue database and manual create remain available.</p> : null}
                      {venueDirectoryResults.length ? <div className="mt-3 space-y-2">{venueDirectoryResults.map((venue) => <button key={venue.id} type="button" onClick={() => useDiscoveredVenue(venue)} className="w-full rounded-xl border border-black/10 bg-white p-3 text-left"><strong className="block text-sm">{venue.name}</strong><span className="mt-1 block text-xs text-neutral-500">{venue.formattedAddress}</span><span className="mt-1 block text-[11px] uppercase tracking-[0.08em] text-neutral-400">Google Places</span></button>)}</div> : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input value={newVenue.name} onChange={(event) => setNewVenue((current) => ({ ...current, name: event.target.value }))} placeholder="Venue name" className="rounded-xl border border-black/15 bg-white px-3 py-3 sm:col-span-2" />
                      <input value={newVenue.town} onChange={(event) => setNewVenue((current) => ({ ...current, town: event.target.value }))} placeholder="Town / city" className="rounded-xl border border-black/15 bg-white px-3 py-3" />
                      <div>
                        <input list="venue-county-options" value={newVenue.county} onChange={(event) => setNewVenue((current) => ({ ...current, county: event.target.value }))} placeholder="County / administrative area" className="w-full rounded-xl border border-black/15 bg-white px-3 py-3" />
                        <datalist id="venue-county-options">{countyLocations.map((location) => <option key={location.id} value={location.name} />)}</datalist>
                      </div>
                      <div>
                        <input list="country-options" value={newVenue.country} onChange={(event) => setNewVenue((current) => ({ ...current, country: event.target.value }))} placeholder="Country" className="w-full rounded-xl border border-black/15 bg-white px-3 py-3" />
                        <datalist id="country-options">{COUNTRY_OPTIONS.map((country) => <option key={country} value={country} />)}</datalist>
                      </div>
                      <select value={newVenue.additionalLocationId} onChange={(event) => setNewVenue((current) => ({ ...current, additionalLocationId: event.target.value }))} className="rounded-xl border border-black/15 bg-white px-3 py-3">
                        <option value="">Optional region / destination…</option>
                        {additionalLocations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.areaType}</option>)}
                      </select>
                      <input value={newVenue.instagram} onChange={(event) => setNewVenue((current) => ({ ...current, instagram: event.target.value }))} placeholder="Instagram" className="rounded-xl border border-black/15 bg-white px-3 py-3" />
                      <input value={newVenue.website} onChange={(event) => setNewVenue((current) => ({ ...current, website: event.target.value }))} placeholder="Website" className="rounded-xl border border-black/15 bg-white px-3 py-3 sm:col-span-2" />
                    </div>
                    <p className="mt-3 text-xs text-neutral-500">Country is globally searchable. County and other geography remain workspace-configurable, so studios in other regions can use states, provinces, regions or destinations instead.</p>
                    {possibleVenueMatches.length ? <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-950"><strong>Possible existing venue:</strong><div className="mt-2 flex flex-wrap gap-2">{possibleVenueMatches.map((venue) => <button key={venue.slug} type="button" onClick={() => { setShowNewVenue(false); setVenuePicker(venue.name); void saveVenue(venue.slug); }} className="admin-action-secondary">Use {venue.name}</button>)}</div></div> : null}
                    <button type="button" disabled={busy || !newVenue.name.trim()} onClick={createAndLinkVenue} className="admin-action-primary mt-4"><Plus className="h-4 w-4" />Create & link venue</button>
                  </div>
                ) : null}
              </section>

              <section className="wedding-workspace-subpanel">
                <div className="wedding-workspace-subpanel__header">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="wedding-workspace-subpanel__icon"><Users className="h-4 w-4" /></span>
                    <div>
                      <p className="wedding-workspace-kicker">Supplier team</p>
                      <p className="mt-1 text-xs text-neutral-500">Use controlled categories and Wedding roles to keep reporting consistent.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowNewSupplier((value) => !value)} className="admin-button admin-button--secondary admin-button--sm">{showNewSupplier ? "Cancel" : "New supplier"}</button>
                </div>

                {suppliers.length ? (
                  <div className="wedding-workspace-supplier-list">
                    {suppliers.map((row, index) => (
                      <div key={`${row.supplierId}-${row.role}-${index}`} className="wedding-workspace-supplier-row">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-semibold text-neutral-900">{row.name}</strong>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">{configuredSupplierCategory(row.category || "", supplierTaxonomy.categories) || row.category || "Uncategorised"}</span>
                        </div>
                        <span className="wedding-workspace-role-tag">{configuredWeddingRole(row.role || "", supplierTaxonomy.roles) || row.role || "Other Supplier"}</span>
                        <button type="button" title={`Remove ${row.name}`} aria-label={`Remove ${row.name}`} disabled={busy} onClick={() => removeSupplier(index)} className="admin-icon-button"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                ) : <div className="wedding-workspace-empty-row">No suppliers linked yet.</div>}

                <div className="wedding-workspace-add-supplier">
                  <div className="wedding-workspace-add-supplier__fields">
                    <AdminSearchSelect
                      label="Add existing supplier"
                      value={selectedSupplierId}
                      options={supplierSearchOptions}
                      onChange={(supplierId) => {
                        const supplier = masterSuppliers.find((item) => item.id === supplierId);
                        setSelectedSupplierId(supplierId);
                        setSupplierRole(supplierId ? defaultWeddingRoleForCategory(supplier?.category || "", supplierTaxonomy.categories, supplierTaxonomy.roles) : "");
                      }}
                      placeholder="Search supplier name, category or location…"
                      help="Select a reusable Supplier Master record."
                    />
                    {selectedSupplier ? (
                      <AdminSearchSelect
                        label="Wedding role"
                        value={configuredWeddingRole(supplierRole, supplierTaxonomy.roles) || supplierRole}
                        options={supplierRoleSearchOptions}
                        onChange={setSupplierRole}
                        placeholder="Search Wedding roles…"
                        help="Type to filter, then choose one controlled role."
                        allowClear={false}
                      />
                    ) : null}
                  </div>
                  {selectedSupplier ? <button disabled={busy} onClick={addSupplier} className="admin-button admin-button--primary admin-button--sm"><Plus className="admin-button__icon" />Add supplier</button> : null}
                </div>

                {showNewSupplier ? (
                  <div className="wedding-workspace-create-supplier">
                    <div className="wedding-workspace-create-supplier__heading">
                      <div><strong>Create supplier</strong><p>Create the master record once, then link it to this wedding.</p></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="wedding-workspace-field sm:col-span-2"><span>Business name</span><input value={newSupplier.name} onChange={(event) => setNewSupplier((current) => ({ ...current, name: event.target.value }))} placeholder="Supplier business name" className="admin-input" /></label>
                      <AdminSearchSelect
                        label="Category"
                        value={configuredSupplierCategory(newSupplier.category, supplierTaxonomy.categories) || newSupplier.category}
                        options={supplierCategorySearchOptions}
                        onChange={(category) => setNewSupplier((current) => ({ ...current, category, role: defaultWeddingRoleForCategory(category, supplierTaxonomy.categories, supplierTaxonomy.roles) }))}
                        placeholder="Search supplier categories…"
                        help="A broad, canonical business category."
                        allowClear={false}
                      />
                      <AdminSearchSelect
                        label="Wedding role"
                        value={configuredWeddingRole(newSupplier.role, supplierTaxonomy.roles) || newSupplier.role}
                        options={newSupplierRoleSearchOptions}
                        onChange={(role) => setNewSupplier((current) => ({ ...current, role }))}
                        placeholder="Search Wedding roles…"
                        help="The specific role performed at this wedding."
                        allowClear={false}
                      />
                      <label className="wedding-workspace-field"><span>Instagram</span><input value={newSupplier.instagram} onChange={(event) => setNewSupplier((current) => ({ ...current, instagram: event.target.value }))} placeholder="@supplier" className="admin-input" /></label>
                      <label className="wedding-workspace-field"><span>Email</span><input value={newSupplier.email} onChange={(event) => setNewSupplier((current) => ({ ...current, email: event.target.value }))} placeholder="supplier@example.com" className="admin-input" /></label>
                      <label className="wedding-workspace-field sm:col-span-2"><span>Website</span><input value={newSupplier.website} onChange={(event) => setNewSupplier((current) => ({ ...current, website: event.target.value }))} placeholder="https://…" className="admin-input" /></label>
                    </div>
                    {possibleSupplierMatches.length ? <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-950"><strong>Possible existing supplier:</strong><div className="mt-2 flex flex-wrap gap-2">{possibleSupplierMatches.map((supplier) => <button key={supplier.id} type="button" onClick={() => { setSelectedSupplierId(supplier.id); setSupplierRole(configuredWeddingRole(newSupplier.role, supplierTaxonomy.roles) || defaultWeddingRoleForCategory(supplier.category, supplierTaxonomy.categories, supplierTaxonomy.roles)); setShowNewSupplier(false); }} className="admin-button admin-button--secondary admin-button--sm">Use {supplier.displayName || supplier.name}</button>)}</div></div> : null}
                    <button type="button" disabled={busy || !newSupplier.name.trim()} onClick={createAndLinkSupplier} className="admin-button admin-button--primary admin-button--sm mt-4"><Plus className="admin-button__icon" />Create & link supplier</button>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section id="preview-upload" className="wedding-workspace-card scroll-mt-5">
            <div className="wedding-workspace-section-header">
              <div><p className="wedding-workspace-kicker">2 · Client delivery</p><h2 className="wedding-workspace-section-title">Client gallery & previews</h2><p className="wedding-workspace-section-copy">Upload preview JPEGs once. Private originals and safe web derivatives are created together.</p></div>
            </div>

            {clientGallery ? (
              <>
                <div className="wedding-workspace-gallery-summary">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm font-semibold">{clientGallery.title}</strong><span className="wedding-workspace-status">{clientGallery.status}</span></div>
                    <p className="mt-1 truncate text-xs text-neutral-500">{clientGallery.clientEmail || "Client email not set"} · {workspace.assets.length} Wedding asset{workspace.assets.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/client-galleries/${clientGallery.id}`} className="admin-button admin-button--secondary admin-button--sm">Manage gallery</Link>
                    {clientGallery.status === "live" ? <a href={publicGalleryUrl(clientGallery.slug, clientGallery.accessToken)} target="_blank" rel="noreferrer" className="admin-button admin-button--secondary admin-button--sm"><ExternalLink className="admin-button__icon" />Open gallery</a> : null}
                    <label className="admin-button admin-button--primary admin-button--sm cursor-pointer"><UploadCloud className="admin-button__icon" />Add preview JPEGs<input type="file" multiple accept="image/jpeg,.jpg,.jpeg" onChange={(event) => { addOriginalFiles(event.target.files); event.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-neutral-500">Selected files are added automatically to the Wedding Day Preview Set.</p>
                {uploads.length ? <div className="mt-4 space-y-2">{uploads.map((item) => <div key={item.id} className="rounded-xl border border-black/10 bg-neutral-50 p-3 grid grid-cols-[minmax(0,1fr)_54px_32px] gap-3 items-center"><div className="min-w-0"><div className="flex items-center gap-2">{item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : item.status === "error" ? <X className="h-4 w-4 text-red-700" /> : item.status === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 text-neutral-400" />}<span className="truncate text-xs">{item.file.name}</span></div><div className="mt-2 h-1 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-black" style={{ width: `${item.progress}%` }} /></div><p className="mt-1 text-[10px] text-neutral-500">{item.error || item.stage}</p></div><span className="text-[10px] text-right">{item.progress}%</span>{item.status === "error" ? <button onClick={() => updateUpload(item.id, { status: "queued", progress: 0, stage: "Ready", error: "" })}><RefreshCw className="h-4 w-4" /></button> : <button disabled={uploading || item.status === "uploading"} onClick={() => setUploads((current) => current.filter((upload) => upload.id !== item.id))}><Trash2 className="h-4 w-4" /></button>}</div>)}</div> : null}
                {uploads.length ? <div className="mt-3 flex justify-end"><button disabled={uploading || !queuedCount} onClick={uploadQueued} className="admin-button admin-button--primary admin-button--sm disabled:opacity-40">{uploading ? "Uploading…" : `Upload ${queuedCount || ""} preview${queuedCount === 1 ? "" : "s"}`}</button></div> : null}
              </>
            ) : (
              <div className="wedding-workspace-gallery-summary">
                <div><strong className="text-sm">No client gallery yet</strong><p className="mt-1 text-xs text-neutral-500">Create the linked private gallery before uploading previews.</p></div>
                <button disabled={busy} onClick={createGallery} className="admin-button admin-button--primary admin-button--sm"><Plus className="admin-button__icon" />Create client gallery</button>
              </div>
            )}
          </section>

          <section className="wedding-workspace-card">
            <div className="wedding-workspace-section-header"><div><p className="wedding-workspace-kicker">3 · Preview Set</p><h2 className="wedding-workspace-section-title">Wedding Day Previews</h2><p className="wedding-workspace-section-copy">Choose the images you want to use across venue galleries, moments, custom galleries and social posts.</p></div><div className="flex gap-2"><button onClick={() => setPreviewIds(workspace.assets.map((asset) => asset.id))} className="admin-button admin-button--secondary admin-button--sm">Select all</button><button disabled={busy} onClick={savePreviewSet} className="admin-button admin-button--primary admin-button--sm"><Save className="admin-button__icon" />Save Preview Set</button></div></div>
            <div className="mt-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 10 }}>
              {workspace.assets.map((asset) => { const selected = previewIds.includes(asset.id); return <button key={asset.id} onClick={() => setPreviewIds((current) => selected ? current.filter((id) => id !== asset.id) : [...current, asset.id])} className={`relative overflow-hidden rounded-2xl border text-left ${selected ? "border-black ring-2 ring-black/10" : "border-black/10"}`}><img src={asset.thumbSrc || asset.webSrc} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} /><span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow">{selected ? <Check className="h-4 w-4" /> : null}</span>{asset.hasOriginal ? <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-1 text-[9px] uppercase text-white">Original</span> : null}<span className="block truncate p-2 text-[11px]">{asset.filename}</span></button>; })}
            </div>
            {!workspace.assets.length ? <p className="mt-5 text-sm text-neutral-500">No canonical assets linked to this wedding yet.</p> : null}
          </section>

          <section id="publishing-destinations" className="wedding-workspace-card scroll-mt-5">
            <p className="wedding-workspace-kicker">4 · Publishing destinations</p><h2 className="wedding-workspace-section-title">Use previews across the Intelligence platform</h2><p className="wedding-workspace-section-copy">This only adds safe web derivatives to public destinations. Private full-resolution originals remain protected.</p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div><p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Venue</p><label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={addToVenue} disabled={!workspace.wedding.venueSlug} onChange={(event) => setAddToVenue(event.target.checked)} /><span>{workspace.wedding.venue || "No venue linked"}</span></label></div>
              <div><p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Moments</p><div className="mt-3 space-y-2 max-h-44 overflow-auto">{workspace.moments.map((moment) => <label key={moment.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selectedMomentIds.includes(moment.id)} onChange={(event) => setSelectedMomentIds((current) => event.target.checked ? [...current, moment.id] : current.filter((id) => id !== moment.id))} />{moment.name}</label>)}</div></div>
              <div><p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Galleries</p><div className="mt-3 space-y-2 max-h-44 overflow-auto">{workspace.galleries.map((gallery) => <label key={gallery.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selectedGalleryIds.includes(gallery.id)} onChange={(event) => setSelectedGalleryIds((current) => event.target.checked ? [...current, gallery.id] : current.filter((id) => id !== gallery.id))} />{gallery.name}</label>)}</div></div>
            </div>
            <button disabled={busy || !previewIds.length} onClick={publishAssignments} className="admin-button admin-button--primary admin-button--sm mt-5 disabled:opacity-40"><Send className="h-4 w-4" />Add {previewIds.length || ""} previews to selected destinations</button>
          </section>
        </main>

        <aside className="admin-summary-panel wedding-workspace-aside">
          <section className="wedding-workspace-aside-card wedding-workspace-social-card">
            <div className="flex items-center gap-3"><Instagram className="h-5 w-5" /><div><p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Social</p><h2 className="text-base" style={{ fontWeight: 600 }}>Instagram preview post</h2></div></div>
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">Generated from the wedding, venue and reusable supplier records. Edit freely before copying.</p>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={14} className="wedding-workspace-caption" />
            <div className="mt-3 flex gap-2"><button onClick={regenerateCaption} className="admin-button admin-button--secondary admin-button--sm">Regenerate</button><button onClick={async () => { await navigator.clipboard?.writeText(caption); setMessage("Instagram caption copied."); }} className="admin-button admin-button--primary admin-button--sm"><Clipboard className="h-4 w-4" />Copy caption</button></div>
          </section>

          <section className="wedding-workspace-aside-card wedding-workspace-summary-card">
            <div className="space-y-3 text-sm"><Row label="Venue" value={workspace.wedding.venue || "Not linked"} /><Row label="Suppliers" value={String(suppliers.length)} /><Row label="Client gallery" value={clientGallery?.status || "Not created"} /><Row label="Wedding assets" value={String(workspace.assets.length)} /><Row label="Preview Set" value={String(previewAssets.length)} /><Row label="Full-res previews" value={String(previewAssets.filter((asset) => asset.hasOriginal).length)} /></div>
            {clientGallery ? <Link to={`/admin/client-galleries/${clientGallery.id}`} className="admin-button admin-button--secondary admin-button--sm mt-4 w-full">Manage client gallery</Link> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-3"><span className="text-neutral-500">{label}</span><strong className="text-right font-medium">{value}</strong></div>;
}
