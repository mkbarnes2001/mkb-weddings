import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  Copy,
  CircleDashed,
  Globe2,
  MapPinned,
  MailCheck,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTab,
  AdminTabs,
} from "../components/ui/AdminUI";
import { AdminApiService } from "../services/AdminApiService";
import { useProfessionalAuth } from "../auth/ProfessionalAuth";
import type {
  ProfessionalInvitationResult,
  WedPlannedBusiness,
  WedPlannedMember,
  WedPlannedPlatformPayload,
  WedPlannedServiceArea,
} from "../types/platform";

type TabKey = "business" | "services" | "team" | "access";

function initialTab(): TabKey {
  const value = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : "";
  return value === "services" || value === "team" || value === "access" ? value : "business";
}

const emptyArea: Partial<WedPlannedServiceArea> = {
  label: "",
  areaType: "region",
  countryCode: "GB",
  regionCode: "",
  radiusMiles: null,
  remoteAvailable: false,
};

const emptyMember: Partial<WedPlannedMember> & { email: string } = {
  email: "",
  displayName: "",
  jobTitle: "",
  role: "staff",
};

type ServiceAreaPreset = {
  key: string;
  label: string;
  areaType: WedPlannedServiceArea["areaType"];
  countryCode?: string;
  regionCode?: string;
  remoteAvailable?: boolean;
};

const serviceAreaPresets: ServiceAreaPreset[] = [
  { key: "northern-ireland", label: "Northern Ireland", areaType: "region", countryCode: "GB", regionCode: "NIR" },
  { key: "republic-of-ireland", label: "Republic of Ireland", areaType: "country", countryCode: "IE" },
  { key: "england", label: "England", areaType: "region", countryCode: "GB", regionCode: "ENG" },
  { key: "scotland", label: "Scotland", areaType: "region", countryCode: "GB", regionCode: "SCT" },
  { key: "wales", label: "Wales", areaType: "region", countryCode: "GB", regionCode: "WLS" },
  { key: "united-kingdom", label: "United Kingdom", areaType: "country", countryCode: "GB" },
  { key: "destination", label: "Destination weddings", areaType: "destination" },
  { key: "remote", label: "Remote / online", areaType: "remote", remoteAvailable: true },
];

function FieldInput({ value, onChange, placeholder = "", type = "text" }: {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="admin-input"
    />
  );
}

function FieldSelect({ value, onChange, children }: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="admin-select">
      {children}
    </select>
  );
}

function toneForScope(status: string): "success" | "warning" | "info" {
  if (status === "scoped") return "success";
  if (status === "migration") return "warning";
  return "info";
}

function labelForScope(status: string) {
  if (status === "scoped") return "Tenant scoped";
  if (status === "migration") return "Migration required";
  return "Planned";
}

export function WedPlannedPlatform() {
  const { auth } = useProfessionalAuth();
  const [platform, setPlatform] = useState<WedPlannedPlatformPayload | null>(null);
  const [business, setBusiness] = useState<WedPlannedBusiness | null>(null);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [serviceArea, setServiceArea] = useState(emptyArea);
  const [serviceAreaPreset, setServiceAreaPreset] = useState("");
  const [member, setMember] = useState(emptyMember);
  const [lastInvitation, setLastInvitation] = useState<ProfessionalInvitationResult | null>(null);
  const canEditBusiness = auth.permissions.includes("business:update");
  const canEditServices = auth.permissions.includes("services:update");
  const canManageMembers = auth.permissions.includes("members:manage");

  function apply(next: WedPlannedPlatformPayload) {
    setPlatform(next);
    setBusiness(next.business);
    const keys = next.categories.filter((category) => category.selected).map((category) => category.key);
    setSelectedCategories(keys);
    setPrimaryCategory(next.categories.find((category) => category.primary)?.key || keys[0] || "");
  }

  useEffect(() => {
    AdminApiService.getWedPlannedPlatform()
      .then(apply)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load WedPlanned foundation."))
      .finally(() => setLoading(false));
  }, []);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, WedPlannedPlatformPayload["categories"]>();
    for (const category of platform?.categories || []) {
      const list = groups.get(category.group) || [];
      list.push(category);
      groups.set(category.group, list);
    }
    return Array.from(groups.entries());
  }, [platform?.categories]);

  function updateBusiness<K extends keyof WedPlannedBusiness>(key: K, value: WedPlannedBusiness[K]) {
    setBusiness((current) => current ? { ...current, [key]: value } : current);
    setMessage("");
  }

  async function run(action: () => Promise<WedPlannedPlatformPayload>, success: string): Promise<boolean> {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const next = await action();
      apply(next);
      setMessage(success);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save WedPlanned settings.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveBusiness() {
    if (!business) return;
    await run(() => AdminApiService.saveWedPlannedBusiness(business), "Business profile saved.");
  }

  async function saveCategories() {
    await run(
      () => AdminApiService.saveWedPlannedCategories(selectedCategories, primaryCategory),
      "Business categories saved.",
    );
  }

  function chooseServiceAreaPreset(key: string) {
    setServiceAreaPreset(key);
    if (!key) {
      setServiceArea({ ...emptyArea, countryCode: business?.defaultCountry || "GB" });
      return;
    }
    if (key === "custom") {
      setServiceArea({ ...emptyArea, areaType: "custom", countryCode: business?.defaultCountry || "GB" });
      return;
    }
    const preset = serviceAreaPresets.find((item) => item.key === key);
    if (!preset) return;
    setServiceArea({
      ...emptyArea,
      label: preset.label,
      areaType: preset.areaType,
      countryCode: preset.countryCode || business?.defaultCountry || "GB",
      regionCode: preset.regionCode || "",
      remoteAvailable: Boolean(preset.remoteAvailable),
    });
  }

  async function addServiceArea() {
    const duplicate = platform?.serviceAreas.some((area) => area.label.trim().toLowerCase() === String(serviceArea.label || "").trim().toLowerCase());
    if (duplicate) {
      setError("That service area is already selected.");
      return;
    }
    const saved = await run(
      () => AdminApiService.saveWedPlannedServiceArea(serviceArea),
      "Service area saved.",
    );
    if (saved) {
      setServiceArea({ ...emptyArea, countryCode: business?.defaultCountry || "GB" });
      setServiceAreaPreset("");
    }
  }

  async function inviteMember() {
    setSaving(true);
    setError("");
    setMessage("");
    setLastInvitation(null);
    try {
      const result = await AdminApiService.inviteWedPlannedMember(member);
      apply(result.platform);
      if (result.invitation) setLastInvitation(result.invitation);
      setMessage(result.invitation?.delivery === "sent" ? "Invitation email sent." : "Invitation created. Copy the secure link below if email delivery is not configured.");
      setMember(emptyMember);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to invite the team member.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-page text-sm text-neutral-500">Loading WedPlanned foundation…</div>;
  if (!platform || !business) {
    return <div className="admin-page rounded-xl bg-red-50 p-5 text-sm text-red-800">{error || "WedPlanned foundation is unavailable."}</div>;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Commercial platform"
        title="WedPlanned"
        description="The neutral business foundation for wedding professionals, CRM, bookings, connected payments and the future marketplace."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatus tone="info">Schema {platform.schemaVersion}</AdminStatus>
            <AdminStatus tone="success">{business.publicName}</AdminStatus>
            <span className="text-xs text-neutral-500">{platform.brand.primaryDomain}</span>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2eee7]"><Building2 size={17} /></span>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">First business</p><p className="text-sm font-semibold">{business.publicName}</p></div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2eee7]"><BriefcaseBusiness size={17} /></span>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Categories</p><p className="text-sm font-semibold">{selectedCategories.length} selected</p></div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2eee7]"><ShieldCheck size={17} /></span>
            <div><p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Tenant readiness</p><p className="text-sm font-semibold">{platform.scopeReadiness.filter((item) => item.status === "scoped").length} modules scoped</p></div>
          </div>
        </div>
      </div>

      <AdminTabs className="mt-1">
        <AdminTab active={tab === "business"} onClick={() => setTab("business")}>Business</AdminTab>
        <AdminTab active={tab === "services"} onClick={() => setTab("services")}>Services & areas</AdminTab>
        <AdminTab active={tab === "team"} onClick={() => setTab("team")}>Team</AdminTab>
        <AdminTab active={tab === "access"} onClick={() => setTab("access")}>Platform access</AdminTab>
      </AdminTabs>

      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{error}</div> : null}

      {tab === "business" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
          <AdminPanel title="Business identity" description="This neutral record will represent photographers, venues, planners and every other WedPlanned professional." icon={Building2}>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Public business name"><FieldInput value={business.publicName} onChange={(value) => updateBusiness("publicName", value)} /></AdminField>
              <AdminField label="Legal name"><FieldInput value={business.legalName} onChange={(value) => updateBusiness("legalName", value)} /></AdminField>
              <AdminField label="Business type">
                <FieldSelect value={business.businessType} onChange={(value) => updateBusiness("businessType", value as WedPlannedBusiness["businessType"])}>
                  <option value="sole_trader">Sole trader</option><option value="partnership">Partnership</option><option value="limited_company">Limited company</option><option value="charity">Charity</option><option value="other">Other</option>
                </FieldSelect>
              </AdminField>
              <AdminField label="Marketplace slug" help={`Future profile: wedplanned.com/pro/${business.marketplaceSlug || "your-business"}`}><FieldInput value={business.marketplaceSlug} onChange={(value) => updateBusiness("marketplaceSlug", value)} /></AdminField>
              <AdminField label="Year established"><FieldInput type="number" value={business.yearEstablished} onChange={(value) => updateBusiness("yearEstablished", value ? Number(value) : null)} /></AdminField>
              <AdminField label="Registration country"><FieldInput value={business.registrationCountry} onChange={(value) => updateBusiness("registrationCountry", value.toUpperCase())} /></AdminField>
              <AdminField label="Company number"><FieldInput value={business.companyNumber} onChange={(value) => updateBusiness("companyNumber", value)} /></AdminField>
              <AdminField label="Tax/VAT reference"><FieldInput value={business.taxNumber} onChange={(value) => updateBusiness("taxNumber", value)} /></AdminField>
            </div>
            <AdminField label="Business summary" className="mt-4">
              <textarea value={business.summary} onChange={(event) => updateBusiness("summary", event.target.value)} rows={4} className="admin-textarea" />
            </AdminField>

            <div className="mt-6 border-t border-black/[0.06] pt-5">
              <h3 className="text-sm font-semibold">Contact and public identity</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <AdminField label="Website"><FieldInput value={business.websiteUrl} onChange={(value) => updateBusiness("websiteUrl", value)} placeholder="https://…" /></AdminField>
                <AdminField label="Contact email"><FieldInput type="email" value={business.contactEmail} onChange={(value) => updateBusiness("contactEmail", value)} /></AdminField>
                <AdminField label="Phone"><FieldInput value={business.phone} onChange={(value) => updateBusiness("phone", value)} /></AdminField>
                <AdminField label="Instagram"><FieldInput value={business.instagram} onChange={(value) => updateBusiness("instagram", value)} placeholder="without @" /></AdminField>
                <AdminField label="Facebook"><FieldInput value={business.facebook} onChange={(value) => updateBusiness("facebook", value)} /></AdminField>
                <AdminField label="TikTok"><FieldInput value={business.tiktok} onChange={(value) => updateBusiness("tiktok", value)} /></AdminField>
                <AdminField label="Timezone"><FieldInput value={business.timezone} onChange={(value) => updateBusiness("timezone", value)} /></AdminField>
                <AdminField label="Currency"><FieldInput value={business.currency} onChange={(value) => updateBusiness("currency", value.toUpperCase())} /></AdminField>
              </div>
            </div>
            <div className="mt-5"><AdminButton variant="primary" icon={Save} onClick={saveBusiness} disabled={saving || !canEditBusiness}>{saving ? "Saving…" : "Save business"}</AdminButton></div>
          </AdminPanel>

          <div className="space-y-5">
            <AdminPanel title="Foundation status" icon={Sparkles} compact>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Workspace</dt><dd className="text-right font-medium">{business.workspaceSlug}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Status</dt><dd className="text-right font-medium">{business.workspaceStatus}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Plan</dt><dd className="text-right font-medium">{business.plan}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Onboarding</dt><dd className="text-right font-medium">{business.onboardingStatus}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Marketplace</dt><dd className="text-right font-medium">{business.marketplaceStatus}</dd></div>
              </dl>
            </AdminPanel>
            <AdminPanel title="Brand direction" icon={Globe2} compact>
              <p className="text-xs leading-5 text-neutral-600"><strong>WedPlanned</strong> is the commercial product. MKB Weddings remains the first live business and proving ground while tenant isolation is completed.</p>
              <div className="mt-4 rounded-xl bg-[#f5f3ef] p-3 text-xs"><div className="font-medium">{platform.brand.primaryDomain}</div><div className="mt-1 text-neutral-500">{platform.brand.ukDomain} will redirect to the primary domain.</div></div>
            </AdminPanel>
          </div>
        </div>
      ) : null}

      {tab === "services" ? (
        <div className="space-y-5">
          <AdminPanel title="Services" description="Choose the services this business offers without filling the page with every category." icon={BriefcaseBusiness} className="!overflow-visible">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.55fr)] lg:items-start">
              <AdminField label="Services offered" help="Open the menu and select one or more wedding-professional services.">
                <details className="group relative">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-black/[0.10] bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition hover:border-black/25 focus-visible:ring-2 focus-visible:ring-black/20 [&::-webkit-details-marker]:hidden">
                    <span>{selectedCategories.length ? `${selectedCategories.length} service${selectedCategories.length === 1 ? "" : "s"} selected` : "Choose services"}</span>
                    <ChevronDown size={15} className="shrink-0 text-neutral-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="absolute left-0 right-0 z-30 mt-2 max-h-[360px] overflow-y-auto rounded-2xl border border-black/[0.08] bg-white p-3 shadow-xl">
                    <div className="space-y-4">
                      {categoryGroups.map(([group, categories]) => (
                        <div key={group}>
                          <p className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{group}</p>
                          <div className="space-y-1">
                            {categories.map((category) => {
                              const selected = selectedCategories.includes(category.key);
                              return (
                                <label key={category.key} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition ${selected ? "bg-black text-white" : "hover:bg-[#f5f3ef]"}`}>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) => {
                                      const next = event.target.checked ? [...selectedCategories, category.key] : selectedCategories.filter((key) => key !== category.key);
                                      setSelectedCategories(next);
                                      if (!event.target.checked && primaryCategory === category.key) setPrimaryCategory(next[0] || "");
                                    }}
                                    className="h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className="min-w-0 truncate font-medium">{category.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </AdminField>

              <AdminField label="Primary service" help="This will lead the future WedPlanned marketplace profile.">
                <FieldSelect value={primaryCategory} onChange={setPrimaryCategory}>
                  <option value="">Choose primary service</option>
                  {platform.categories.filter((category) => selectedCategories.includes(category.key)).map((category) => <option key={category.key} value={category.key}>{category.name}</option>)}
                </FieldSelect>
              </AdminField>
            </div>

            <div className="mt-4 flex min-h-8 flex-wrap gap-2">
              {platform.categories.filter((category) => selectedCategories.includes(category.key)).map((category) => (
                <span key={category.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${primaryCategory === category.key ? "bg-black text-white" : "bg-[#f2eee7] text-neutral-700"}`}>
                  {category.name}
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedCategories.filter((key) => key !== category.key);
                      setSelectedCategories(next);
                      if (primaryCategory === category.key) setPrimaryCategory(next[0] || "");
                    }}
                    className="rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100"
                    aria-label={`Remove ${category.name}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {!selectedCategories.length ? <span className="text-[10px] text-neutral-400">No services selected.</span> : null}
            </div>

            <div className="mt-4 flex justify-end">
              <AdminButton variant="primary" icon={Save} onClick={saveCategories} disabled={saving || !canEditServices || !selectedCategories.length}>Save services</AdminButton>
            </div>
          </AdminPanel>

          <AdminPanel title="Service areas" description="Select the regions this business covers. Use a custom area only when a preset does not fit." icon={MapPinned}>
            <div className="flex flex-wrap gap-2">
              {platform.serviceAreas.length ? platform.serviceAreas.map((area) => (
                <span key={area.id} className="inline-flex items-center gap-2 rounded-full bg-[#f2eee7] px-3 py-1.5 text-[10px] font-medium text-neutral-700">
                  <span>{area.label}</span>
                  <span className="text-neutral-400">{area.areaType}</span>
                  <button type="button" disabled={!canEditServices} onClick={() => run(() => AdminApiService.archiveWedPlannedServiceArea(area.id), "Service area removed.")} className="rounded-full p-0.5 text-neutral-400 hover:bg-white hover:text-red-600" aria-label={`Remove ${area.label}`}><X size={11} /></button>
                </span>
              )) : <span className="text-xs text-neutral-500">No service areas selected.</span>}
            </div>

            <div className="mt-5 rounded-2xl bg-[#f7f5f1] p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <AdminField label="Add a service area">
                  <FieldSelect value={serviceAreaPreset} onChange={chooseServiceAreaPreset}>
                    <option value="">Choose an area</option>
                    {serviceAreaPresets.map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
                    <option value="custom">Custom area…</option>
                  </FieldSelect>
                </AdminField>
                <AdminButton variant="secondary" icon={Plus} onClick={addServiceArea} disabled={saving || !canEditServices || !serviceArea.label}>Add area</AdminButton>
              </div>

              {serviceAreaPreset && serviceAreaPreset !== "custom" ? (
                <div className="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs">
                  <span className="font-semibold">{serviceArea.label}</span>
                  <span className="ml-2 text-[10px] text-neutral-500">{serviceArea.areaType} · {serviceArea.countryCode}</span>
                </div>
              ) : null}

              {serviceAreaPreset === "custom" ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <AdminField label="Area name" className="md:col-span-2"><FieldInput value={serviceArea.label} onChange={(value) => setServiceArea({ ...serviceArea, label: value })} placeholder="County Down" /></AdminField>
                  <AdminField label="Area type"><FieldSelect value={String(serviceArea.areaType)} onChange={(value) => setServiceArea({ ...serviceArea, areaType: value as WedPlannedServiceArea["areaType"] })}><option value="local">Local</option><option value="city">City</option><option value="county">County</option><option value="region">Region</option><option value="country">Country</option><option value="destination">Destination</option><option value="remote">Remote</option><option value="custom">Custom</option></FieldSelect></AdminField>
                  <AdminField label="Country code"><FieldInput value={serviceArea.countryCode} onChange={(value) => setServiceArea({ ...serviceArea, countryCode: value.toUpperCase().slice(0, 2) })} /></AdminField>
                  <AdminField label="Radius (miles)"><FieldInput type="number" value={serviceArea.radiusMiles} onChange={(value) => setServiceArea({ ...serviceArea, radiusMiles: value ? Number(value) : null })} /></AdminField>
                </div>
              ) : null}
            </div>
          </AdminPanel>
        </div>
      ) : null}

      {tab === "team" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <AdminPanel title="Business team" description="Memberships are business-owned. Invitations are one-time, role-scoped and activate a secure professional session." icon={Users}>
            <div className="space-y-3">
              {platform.members.length ? platform.members.map((teamMember) => (
                <div key={teamMember.id} className="grid gap-3 rounded-xl bg-[#f5f3ef] p-4 md:grid-cols-[minmax(0,1fr)_150px_120px_auto] md:items-center">
                  <div className="min-w-0"><p className="truncate text-xs font-semibold">{teamMember.displayName || teamMember.email}</p><p className="mt-1 truncate text-[10px] text-neutral-500">{teamMember.email}{teamMember.jobTitle ? ` · ${teamMember.jobTitle}` : ""}</p></div>
                  <select disabled={!canManageMembers} value={teamMember.role} onChange={(event) => run(() => AdminApiService.updateWedPlannedMember({ ...teamMember, role: event.target.value as WedPlannedMember["role"] }), "Team role updated.")} className="admin-select text-xs"><option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="content">Content</option><option value="finance">Finance</option><option value="staff">Staff</option><option value="viewer">Viewer</option></select>
                  <AdminStatus tone={teamMember.status === "active" ? "success" : "warning"}>{teamMember.status}</AdminStatus>
                  <button type="button" disabled={!canManageMembers} onClick={() => run(() => AdminApiService.updateWedPlannedMember({ ...teamMember, status: "disabled" }), "Team member disabled.")} className="rounded-lg p-2 text-neutral-400 hover:bg-white hover:text-red-600" aria-label={`Disable ${teamMember.email}`}><Trash2 size={14} /></button>
                </div>
              )) : <p className="text-xs text-neutral-500">No team memberships have been added.</p>}
            </div>
          </AdminPanel>

          <AdminPanel title="Invite a team member" description="Send an invitation email when delivery is configured, or copy the one-time secure link manually." icon={Plus}>
            <div className="space-y-3">
              <AdminField label="Email"><FieldInput type="email" value={member.email} onChange={(value) => setMember({ ...member, email: value })} /></AdminField>
              <AdminField label="Name"><FieldInput value={member.displayName} onChange={(value) => setMember({ ...member, displayName: value })} /></AdminField>
              <AdminField label="Job title"><FieldInput value={member.jobTitle} onChange={(value) => setMember({ ...member, jobTitle: value })} /></AdminField>
              <AdminField label="Role"><FieldSelect value={String(member.role)} onChange={(value) => setMember({ ...member, role: value as WedPlannedMember["role"] })}><option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="content">Content</option><option value="finance">Finance</option><option value="staff">Staff</option><option value="viewer">Viewer</option></FieldSelect></AdminField>
              <AdminButton variant="primary" icon={Plus} onClick={inviteMember} disabled={saving || !canManageMembers || !member.email}>Send invitation</AdminButton>
              {lastInvitation ? (
                <div className={`rounded-xl p-3 text-xs ${lastInvitation.delivery === "sent" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  <div className="flex items-center gap-2 font-semibold"><MailCheck size={14} />{lastInvitation.delivery === "sent" ? "Invitation email sent" : "Manual invitation link ready"}</div>
                  <p className="mt-1 text-[10px] leading-4 opacity-75">Expires {new Date(lastInvitation.expiresAt).toLocaleString("en-GB")}.</p>
                  {lastInvitation.delivery === "manual" ? (
                    <button type="button" onClick={() => lastInvitation.invitationUrl && navigator.clipboard?.writeText(lastInvitation.invitationUrl)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-black ring-1 ring-black/10"><Copy size={12} /> Copy secure invitation link</button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </AdminPanel>
        </div>
      ) : null}

      {tab === "access" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <AdminPanel title="Tenant-isolation readiness" description="This is the live audit boundary for external WedPlanned businesses." icon={ShieldCheck}>
            <div className="space-y-2">
              {platform.scopeReadiness.map((item) => (
                <div key={item.key} className="grid gap-2 rounded-xl bg-[#f5f3ef] p-3 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
                  <div><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[10px] leading-4 text-neutral-500">{item.detail}</p></div>
                  <AdminStatus tone={toneForScope(item.status)}>{labelForScope(item.status)}</AdminStatus>
                </div>
              ))}
            </div>
          </AdminPanel>

          <div className="space-y-5">
            <AdminPanel title="Professional access" description="Session and business context are resolved on the server." icon={ShieldCheck} compact>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4"><span className="text-neutral-500">Mode</span><AdminStatus tone={auth.authenticated ? "success" : "warning"}>{auth.mode === "bootstrap" ? "Setup mode" : auth.authenticated ? "Secure session" : "Sign-in required"}</AdminStatus></div>
                <div className="flex items-center justify-between gap-4"><span className="text-neutral-500">Enforcement</span><span className="font-medium">{auth.enforced ? "Enabled" : "Not enabled"}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-neutral-500">Business context</span><span className="truncate text-right font-medium">{auth.businessName}</span></div>
                <div className="flex items-center justify-between gap-4"><span className="text-neutral-500">Role</span><span className="capitalize font-medium">{auth.role}</span></div>
              </div>
              {!auth.enforced ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">Keep external onboarding disabled until authentication is enforced and legacy Weddings, Venues, Suppliers and public-gallery routes are tenant-scoped.</p> : null}
            </AdminPanel>
            <AdminPanel title="Feature entitlements" description="MKB is an internal founder business, so all foundation features are enabled while commercial plans are designed." icon={BadgeCheck}>
              <div className="space-y-2">
                {platform.entitlements.map((feature) => (
                  <div key={feature.key} className="flex items-start gap-3 rounded-xl bg-[#f5f3ef] p-3">
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${feature.enabled ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-500"}`}>{feature.enabled ? <Check size={12} /> : <CircleDashed size={12} />}</span>
                    <div><p className="text-xs font-semibold">{feature.name}</p><p className="mt-1 text-[10px] leading-4 text-neutral-500">{feature.description}</p></div>
                  </div>
                ))}
              </div>
            </AdminPanel>
            <AdminPanel title="Recent foundation activity" compact>
              <div className="space-y-3">
                {platform.recentAudit.length ? platform.recentAudit.map((event) => (
                  <div key={event.id} className="border-b border-black/[0.06] pb-3 last:border-0 last:pb-0"><p className="text-xs font-medium">{event.summary}</p><p className="mt-1 text-[10px] text-neutral-500">{event.createdAt}</p></div>
                )) : <p className="text-xs text-neutral-500">No platform changes recorded yet.</p>}
              </div>
            </AdminPanel>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
