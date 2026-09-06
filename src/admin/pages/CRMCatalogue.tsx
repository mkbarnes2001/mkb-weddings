import { AdminActionRouterLink } from "../components/ui/AdminActionControl";
import { PackageImageEditor } from "../components/PackageImageEditor";
import {
  useEffect,
  useMemo,
  useState } from "react";
import { ArrowLeft,
  Boxes,
  PackagePlus,
  Plus,
  Save } from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  } from "react-router-dom";
import { AdminButton,
  AdminEmptyState,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTab,
  AdminTabs,
} from "../components/ui/AdminUI";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import { AdminApiService } from "../services/AdminApiService";
import type { CrmAddon, CrmPackage } from "../types/crm";

type View = "packages" | "addons";

const emptyPackage: Partial<CrmPackage> = { name: "", serviceType: "wedding", internalCode: "", description: "", priceAmount: 0, currency: "GBP", coverageMinutes: null, deliverables: [], includedItems: [], clientNotes: "", displayOrder: 0, recommended: false, status: "active", imageUrl: "", addonIds: [] };
const emptyAddon: Partial<CrmAddon> = { name: "", description: "", priceAmount: 0, currency: "GBP", serviceType: "wedding", status: "active", displayOrder: 0, availabilityScope: "all", minimumQuantity: 0, maximumQuantity: 1, requirement: "optional" };

function money(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format((value || 0) / 100);
}
function lines(value: string[] | undefined) { return (value || []).join("\n"); }
function splitLines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }

export function CRMCatalogue() {

  const {
    id: catalogueRouteId,
  } = useParams();

  const {
    pathname,
  } = useLocation();

  const navigate =
    useNavigate();

  const packageRouteId =
    pathname.startsWith(
      "/admin/crm/catalogue/packages/",
    )
      ? catalogueRouteId
      : undefined;

  const addonRouteId =
    pathname.startsWith(
      "/admin/crm/catalogue/addons/",
    )
      ? catalogueRouteId
      : undefined;

  const { auth } = useProfessionalAuth();
  const canManage = auth.permissions.includes("crm:manage") && auth.accessMode !== "support";
  const [view, setView] = useState<View>("packages");
  const [packages, setPackages] = useState<CrmPackage[]>([]);
  const [addons, setAddons] = useState<CrmAddon[]>([]);
  const [packageDraft, setPackageDraft] = useState<Partial<CrmPackage>>(emptyPackage);
  const [addonDraft, setAddonDraft] = useState<Partial<CrmAddon>>(emptyAddon);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const catalogue = await AdminApiService.getCrmQuoteCatalogue();
      setPackages(
        catalogue.packages,
      );

      setAddons(
        catalogue.addons,
      );

      if (packageRouteId) {
        if (
          packageRouteId
          === "new"
        ) {
          setPackageDraft({
            ...emptyPackage,
          });
        } else {
          const selectedPackage =
            catalogue.packages.find(
              (item) =>
                item.id
                === packageRouteId,
            );

          if (selectedPackage) {
            setPackageDraft({
              ...selectedPackage,
            });
          } else {
            setPackageDraft({
              ...emptyPackage,
            });

            setError(
              "Package not found.",
            );
          }
        }
      }
      if (addonRouteId) {
        if (
          addonRouteId
          === "new"
        ) {
          setAddonDraft({
            ...emptyAddon,
          });
        } else {
          const selectedAddon =
            catalogue.addons.find(
              (item) =>
                item.id
                === addonRouteId,
            );

          if (selectedAddon) {
            setAddonDraft({
              ...selectedAddon,
            });
          } else {
            setAddonDraft({
              ...emptyAddon,
            });

            setError(
              "Add-on not found.",
            );
          }
        }
      }

    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load package catalogue."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
  }, [
    auth.workspaceId,
    packageRouteId,
    addonRouteId,
  ]);

  useEffect(() => {
    setView(
      pathname.startsWith(
        "/admin/crm/catalogue/addons",
      )
        ? "addons"
        : "packages",
    );
  }, [pathname]);


  const selectedPackageAddonNames = useMemo(() => new Map(addons.map((addon) => [addon.id, addon.name])), [addons]);

  async function savePackage() {
    if (!canManage || uploading || saving) return;
    const creating =
      !packageDraft.id;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService
          .saveCrmPackage(
            packageDraft.id,
            packageDraft,
          );

      setMessage(
        `${saved.name} saved.`,
      );

      setPackageDraft({
        ...saved,
      });

      if (creating) {
        navigate(
          `/admin/crm/catalogue/packages/${saved.id}`,
          {
            replace: true,
          },
        );
      } else {
        await load();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save package.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveAddon() {
    const creating =
      !addonDraft.id;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService
          .saveCrmAddon(
            addonDraft.id,
            addonDraft,
          );

      setMessage(
        `${saved.name} saved.`,
      );

      setAddonDraft({
        ...saved,
      });

      if (creating) {
        navigate(
          `/admin/crm/catalogue/addons/${saved.id}`,
          {
            replace: true,
          },
        );
      } else {
        await load();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save add-on.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !packages.length && !addons.length) return <AdminPage><p className="text-sm text-neutral-500">Loading catalogue…</p></AdminPage>;

  if (packageRouteId) {
    const missingPackage =
      packageRouteId
      !== "new"
      && !packageDraft.id;

    return (
      <AdminPage className="crm-package-editor-page">
        <AdminPageHeader
          title={
            packageRouteId
            === "new"
              ? "New package"
              : (
                  packageDraft.name
                  || "Package"
                )
          }
          description="Configure the reusable package shown in quotes. Existing quote and booking snapshots remain unchanged when the catalogue is edited."
        />

        {error ? (
          <div className="admin-alert admin-alert--error">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="admin-alert admin-alert--success">
            {message}
          </div>
        ) : null}

        {missingPackage ? (
          <AdminPanel>
            <AdminEmptyState
              icon={PackagePlus}
              title="Package unavailable"
              description="This package could not be found in the current workspace."
              action={
                <AdminActionRouterLink
                  to="/admin/crm/catalogue"
                  className="admin-button admin-button--primary admin-button--sm"
                >
                  Back to packages
                </AdminActionRouterLink>
              }
            />
          </AdminPanel>
        ) : (
<AdminPanel title={packageDraft.id ? "Edit package" : "New package"} description="Catalogue changes never alter existing quotes or booked Jobs." icon={PackagePlus} actions={packageDraft.id ? <AdminButton size="sm" onClick={() => navigate("/admin/crm/catalogue/packages/new")}>New</AdminButton> : undefined}>
        <div className="grid gap-3 md:grid-cols-2">
          <AdminField label="Name"><input className="admin-input" disabled={!canManage} value={packageDraft.name || ""} onChange={(event) => setPackageDraft((current) => ({ ...current, name: event.target.value }))} /></AdminField>
          <AdminField label="Internal code"><input className="admin-input" disabled={!canManage} value={packageDraft.internalCode || ""} onChange={(event) => setPackageDraft((current) => ({ ...current, internalCode: event.target.value }))} /></AdminField>
          <AdminField label="Service type"><input className="admin-input" disabled={!canManage} value={packageDraft.serviceType || ""} onChange={(event) => setPackageDraft((current) => ({ ...current, serviceType: event.target.value }))} /></AdminField>
          <AdminField label="Price"><input className="admin-input" type="number" min="0" step="0.01" disabled={!canManage} value={(packageDraft.priceAmount || 0) / 100} onChange={(event) => setPackageDraft((current) => ({ ...current, priceAmount: Math.round(Number(event.target.value || 0) * 100) }))} /></AdminField>
          <AdminField label="Currency"><input className="admin-input" maxLength={3} disabled={!canManage} value={packageDraft.currency || "GBP"} onChange={(event) => setPackageDraft((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))} /></AdminField>
          <AdminField label="Coverage minutes"><input className="admin-input" type="number" min="0" disabled={!canManage} value={packageDraft.coverageMinutes ?? ""} onChange={(event) => setPackageDraft((current) => ({ ...current, coverageMinutes: event.target.value ? Number(event.target.value) : null }))} /></AdminField>
          <AdminField label="Display order"><input className="admin-input" type="number" disabled={!canManage} value={packageDraft.displayOrder || 0} onChange={(event) => setPackageDraft((current) => ({ ...current, displayOrder: Number(event.target.value || 0) }))} /></AdminField>
          <AdminField label="State"><select className="admin-select" disabled={!canManage} value={packageDraft.status || "active"} onChange={(event) => setPackageDraft((current) => ({ ...current, status: event.target.value as CrmPackage["status"] }))}><option value="active">Active</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select></AdminField>
          <label className="admin-checkbox-row"><input type="checkbox" disabled={!canManage} checked={Boolean(packageDraft.recommended)} onChange={(event) => setPackageDraft((current) => ({ ...current, recommended: event.target.checked }))} /><span>Recommended package</span></label>
        </div>
        <PackageImageEditor key={packageRouteId} value={packageDraft} disabled={!canManage || saving || uploading} onBusyChange={setUploading} onChange={patch => setPackageDraft(current => ({ ...current, ...patch }))} />
        <div className="mt-3 grid gap-3 md:grid-cols-2"><AdminField label="Description"><textarea className="admin-textarea min-h-24" disabled={!canManage} value={packageDraft.description || ""} onChange={(event) => setPackageDraft((current) => ({ ...current, description: event.target.value }))} /></AdminField><AdminField label="Client-facing notes"><textarea className="admin-textarea min-h-24" disabled={!canManage} value={packageDraft.clientNotes || ""} onChange={(event) => setPackageDraft((current) => ({ ...current, clientNotes: event.target.value }))} /></AdminField><AdminField label="Included items" help="One item per line"><textarea className="admin-textarea min-h-28" disabled={!canManage} value={lines(packageDraft.includedItems)} onChange={(event) => setPackageDraft((current) => ({ ...current, includedItems: splitLines(event.target.value) }))} /></AdminField><AdminField label="Deliverables" help="One deliverable per line"><textarea className="admin-textarea min-h-28" disabled={!canManage} value={lines(packageDraft.deliverables)} onChange={(event) => setPackageDraft((current) => ({ ...current, deliverables: splitLines(event.target.value) }))} /></AdminField></div>
        <fieldset className="admin-field crm-package-addons"><legend className="admin-field__label">Available add-ons</legend><div className="crm-checkbox-grid">{addons.filter((addon) => addon.status !== "archived").map((addon) => <label key={addon.id}><input type="checkbox" disabled={!canManage} checked={(packageDraft.addonIds || []).includes(addon.id)} onChange={(event) => setPackageDraft((current) => ({ ...current, addonIds: event.target.checked ? [...(current.addonIds || []), addon.id] : (current.addonIds || []).filter((id) => id !== addon.id) }))} /><span>{addon.name}<small>{money(addon.priceAmount, addon.currency)} · {addon.requirement}</small></span></label>)}</div><p className="admin-field__help">Add-ons available for all packages are included automatically.</p></fieldset>
        <div className="mt-4"><AdminButton variant="primary" icon={Save} disabled={!canManage || saving || uploading || !packageDraft.name?.trim()} onClick={() => void savePackage()}>Save package</AdminButton></div>
      </AdminPanel>
        )}
      </AdminPage>
    );
  }


  if (addonRouteId) {
    const missingAddon =
      addonRouteId
      !== "new"
      && !addonDraft.id;

    return (
      <AdminPage className="crm-addon-editor-page">
        <AdminPageHeader
          title={
            addonRouteId
            === "new"
              ? "New add-on"
              : (
                  addonDraft.name
                  || "Add-on"
                )
          }
          description="Configure a reusable quote extra, its package availability, requirement and quantity limits. Existing quote snapshots remain unchanged."
        />

        {error ? (
          <div className="admin-alert admin-alert--error">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="admin-alert admin-alert--success">
            {message}
          </div>
        ) : null}

        {missingAddon ? (
          <AdminPanel>
            <AdminEmptyState
              icon={Plus}
              title="Add-on unavailable"
              description="This add-on could not be found in the current workspace."
              action={
                <AdminActionRouterLink
                  to="/admin/crm/catalogue/addons"
                  className="admin-button admin-button--primary admin-button--sm"
                >
                  Back to add-ons
                </AdminActionRouterLink>
              }
            />
          </AdminPanel>
        ) : (
<AdminPanel title={addonDraft.id ? "Edit add-on" : "New add-on"} description="Set quantity limits and whether the add-on is optional, recommended or mandatory." icon={Plus} actions={addonDraft.id ? <AdminButton size="sm" onClick={() => navigate("/admin/crm/catalogue/addons/new")}>New</AdminButton> : undefined}>
        <div className="grid gap-3 md:grid-cols-2"><AdminField label="Name"><input className="admin-input" disabled={!canManage} value={addonDraft.name || ""} onChange={(event) => setAddonDraft((current) => ({ ...current, name: event.target.value }))} /></AdminField><AdminField label="Price"><input className="admin-input" type="number" min="0" step="0.01" disabled={!canManage} value={(addonDraft.priceAmount || 0) / 100} onChange={(event) => setAddonDraft((current) => ({ ...current, priceAmount: Math.round(Number(event.target.value || 0) * 100) }))} /></AdminField><AdminField label="Currency"><input className="admin-input" maxLength={3} disabled={!canManage} value={addonDraft.currency || "GBP"} onChange={(event) => setAddonDraft((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))} /></AdminField><AdminField label="Service type"><input className="admin-input" disabled={!canManage} value={addonDraft.serviceType || ""} onChange={(event) => setAddonDraft((current) => ({ ...current, serviceType: event.target.value }))} /></AdminField><AdminField label="Availability"><select className="admin-select" disabled={!canManage} value={addonDraft.availabilityScope || "all"} onChange={(event) => setAddonDraft((current) => ({ ...current, availabilityScope: event.target.value as CrmAddon["availabilityScope"] }))}><option value="all">All packages</option><option value="selected">Selected packages</option></select></AdminField><AdminField label="Requirement"><select className="admin-select" disabled={!canManage} value={addonDraft.requirement || "optional"} onChange={(event) => setAddonDraft((current) => ({ ...current, requirement: event.target.value as CrmAddon["requirement"] }))}><option value="optional">Optional</option><option value="recommended">Recommended</option><option value="mandatory">Mandatory</option></select></AdminField><AdminField label="State"><select className="admin-select" disabled={!canManage} value={addonDraft.status || "active"} onChange={(event) => setAddonDraft((current) => ({ ...current, status: event.target.value as CrmAddon["status"] }))}><option value="active">Active</option><option value="hidden">Hidden</option><option value="archived">Archived</option></select></AdminField><AdminField label="Minimum quantity"><input className="admin-input" type="number" min="0" disabled={!canManage} value={addonDraft.minimumQuantity || 0} onChange={(event) => setAddonDraft((current) => ({ ...current, minimumQuantity: Number(event.target.value || 0) }))} /></AdminField><AdminField label="Maximum quantity"><input className="admin-input" type="number" min="1" disabled={!canManage} value={addonDraft.maximumQuantity || 1} onChange={(event) => setAddonDraft((current) => ({ ...current, maximumQuantity: Number(event.target.value || 1) }))} /></AdminField><AdminField label="Display order"><input className="admin-input" type="number" disabled={!canManage} value={addonDraft.displayOrder || 0} onChange={(event) => setAddonDraft((current) => ({ ...current, displayOrder: Number(event.target.value || 0) }))} /></AdminField></div>
        <div className="mt-3"><AdminField label="Description"><textarea className="admin-textarea min-h-28" disabled={!canManage} value={addonDraft.description || ""} onChange={(event) => setAddonDraft((current) => ({ ...current, description: event.target.value }))} /></AdminField></div>
        <div className="mt-4"><AdminButton variant="primary" icon={Save} disabled={!canManage || saving || !addonDraft.name?.trim()} onClick={() => void saveAddon()}>Save add-on</AdminButton></div>
      </AdminPanel>
        )}
      </AdminPage>
    );
  }


  return <AdminPage>
    <AdminPageHeader title="Package catalogue" description="Workspace-owned packages and add-ons used to create immutable quote snapshots." />
    {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
    {message ? <div className="admin-alert admin-alert--success">{message}</div> : null}
    <AdminTabs>
      <AdminTab
        active={view === "packages"}
        onClick={() =>
          navigate(
            "/admin/crm/catalogue",
          )
        }
      >
        Packages
      </AdminTab>

      <AdminTab
        active={view === "addons"}
        onClick={() =>
          navigate(
            "/admin/crm/catalogue/addons",
          )
        }
      >
        Add-ons
      </AdminTab>
    </AdminTabs>

    {view === "packages" ? (
      <AdminPanel
        title="Packages"
        description={`${packages.length} catalogue record${packages.length === 1 ? "" : "s"}`}
        icon={Boxes}
        className="crm-package-list-page"
        actions={
          canManage ? (
            <AdminActionRouterLink
              to="/admin/crm/catalogue/packages/new"
              className="admin-button admin-button--primary admin-button--sm"
            >
              <PackagePlus className="admin-button__icon" />
              New package
            </AdminActionRouterLink>
          ) : undefined
        }
      >
        {!packages.length ? (
          <AdminEmptyState
            icon={PackagePlus}
            title="No packages"
            description="Create the first reusable package for this workspace."
            action={
              canManage ? (
                <AdminActionRouterLink
                  to="/admin/crm/catalogue/packages/new"
                  className="admin-button admin-button--primary admin-button--sm"
                >
                  Create package
                </AdminActionRouterLink>
              ) : undefined
            }
          />
        ) : (
          <div className="crm-catalogue-list crm-catalogue-list--links">
            {packages.map(
              (item) => (
                <Link
                  key={item.id}
                  to={`/admin/crm/catalogue/packages/${item.id}`}
                  aria-label={`Edit package ${item.name}`}
                >
                  <div>
                    <strong>
                      {item.name}
                    </strong>

                    <p>
                      {item.description
                        || item.serviceType}
                    </p>

                    <small>
                      {item.addonIds
                        .map(
                          (id) =>
                            selectedPackageAddonNames
                              .get(id),
                        )
                        .filter(Boolean)
                        .join(" · ")
                        || "All-package add-ons only"}
                    </small>
                  </div>

                  <div>
                    <span>
                      {money(
                        item.priceAmount,
                        item.currency,
                      )}
                    </span>

                    <AdminStatus
                      tone={
                        item.status === "active"
                          ? "success"
                          : item.status === "hidden"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {item.status}
                    </AdminStatus>

                    {item.recommended ? (
                      <AdminStatus tone="info">
                        recommended
                      </AdminStatus>
                    ) : null}
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </AdminPanel>
    ) : null}

    {view === "addons" ? (
      <AdminPanel
        title="Add-ons"
        description={`${addons.length} catalogue record${addons.length === 1 ? "" : "s"}`}
        icon={Boxes}
        className="crm-addon-list-page"
        actions={
          canManage ? (
            <AdminActionRouterLink
              to="/admin/crm/catalogue/addons/new"
              className="admin-button admin-button--primary admin-button--sm"
            >
              <Plus className="admin-button__icon" />
              New add-on
            </AdminActionRouterLink>
          ) : undefined
        }
      >
        {!addons.length ? (
          <AdminEmptyState
            icon={Plus}
            title="No add-ons"
            description="Create optional, recommended or mandatory quote extras."
            action={
              canManage ? (
                <AdminActionRouterLink
                  to="/admin/crm/catalogue/addons/new"
                  className="admin-button admin-button--primary admin-button--sm"
                >
                  Create add-on
                </AdminActionRouterLink>
              ) : undefined
            }
          />
        ) : (
          <div className="crm-catalogue-list crm-catalogue-list--links">
            {addons.map(
              (item) => (
                <Link
                  key={item.id}
                  to={`/admin/crm/catalogue/addons/${item.id}`}
                  aria-label={`Edit add-on ${item.name}`}
                >
                  <div>
                    <strong>
                      {item.name}
                    </strong>

                    <p>
                      {item.description
                        || item.serviceType}
                    </p>

                    <small>
                      {item.availabilityScope === "all"
                        ? "All packages"
                        : "Selected packages"}
                      {" · "}
                      quantity
                      {" "}
                      {item.minimumQuantity}
                      –
                      {item.maximumQuantity}
                    </small>
                  </div>

                  <div>
                    <span>
                      {money(
                        item.priceAmount,
                        item.currency,
                      )}
                    </span>

                    <AdminStatus
                      tone={
                        item.requirement === "mandatory"
                          ? "danger"
                          : item.requirement === "recommended"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {item.requirement}
                    </AdminStatus>

                    <AdminStatus
                      tone={
                        item.status === "active"
                          ? "success"
                          : item.status === "hidden"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {item.status}
                    </AdminStatus>
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </AdminPanel>
    ) : null}
  </AdminPage>;
}
